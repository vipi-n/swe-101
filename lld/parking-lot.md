# Parking Lot — Low Level Design (Java)

A complete LLD for a multi-floor / multi-spot Parking Lot system using
**Facade + Strategy + Polymorphism** — fully thread-safe.

---

## Table of Contents
0. [Quick Step-by-Step Recap](#0-quick-step-by-step-recap)
1. [Problem Statement](#1-problem-statement)
2. [Design Patterns Used](#2-design-patterns-used)
3. [Folder Layout](#3-folder-layout)
4. [Step-by-Step Code Walkthrough](#4-step-by-step-code-walkthrough)
   - [Step 1 — Enums (`VehicleType`, `SpotType`)](#step-1--enums)
   - [Step 2 — Vehicle](#step-2--vehicle)
   - [Step 3 — ParkingSpot](#step-3--parkingspot)
   - [Step 4 — Ticket](#step-4--ticket)
   - [Step 5 — Pricing Strategy](#step-5--pricing-strategy)
   - [Step 6 — Hourly Pricing Implementation](#step-6--hourly-pricing-implementation)
   - [Step 7 — Spot Allocation Strategy](#step-7--spot-allocation-strategy)
   - [Step 8 — Nearest-First Allocation](#step-8--nearest-first-allocation)
   - [Step 9 — ParkingLot Facade](#step-9--parkinglot-facade)
   - [Step 10 — Demo Driver](#step-10--demo-driver)
5. [Concurrency & Race Conditions](#5-concurrency--race-conditions)
6. [Extensibility](#6-extensibility)
7. [SOLID Compliance](#7-solid-compliance)

---
## 0. Quick Step-by-Step Recap

A guided tour of how the design was built up — each step explains **what we did** and **why**.

---

### Step 1 — Understand the requirements

Before writing any code, lock down what the system must do:

- Accept **3 vehicle types** (Motorcycle / Car / Truck) and **3 spot types** (Motorcycle / Compact / Large).
- Enforce **size compatibility** — a truck can't squeeze into a motorcycle slot.
- Issue a **ticket** at entry, compute a **fare** at exit.
- **Pluggable** pricing (hourly, day-pass, EV discount) and allocation (nearest, random, by-floor).
- **Thread-safe** — multiple gates handle concurrent entries/exits.

> Skipping this step = building the wrong system. Always start here in an interview.

---

### Step 2 — Pick the right design patterns

| Concern | Pattern | Why |
|---|---|---|
| Hide complexity behind a clean API | **Facade** (`ParkingLot`) | Outside world only sees `park()` / `unpark()` |
| Swap pricing or allocation rules | **Strategy** | `PricingStrategy`, `SpotAllocationStrategy` |
| Avoid one big lock | **Per-resource lock** | Each spot has its own `synchronized` — N parallel parks across N spots |
| Single source of truth for size rules | **Polymorphic enum behavior** | `Vehicle.canFitIn(SpotType)` |

---

### Step 3 — Model the enums

Vehicle and spot types are small, closed sets → enums give type safety, exhaustive `switch`, and zero allocation.

- `VehicleType` → `MOTORCYCLE | CAR | TRUCK`
- `SpotType` → `MOTORCYCLE | COMPACT | LARGE`

> Why not strings? Strings allow typos (`"TRUk"`) and miss compile-time checks. Enums fail at compile time.

---

### Step 4 — Build the `Vehicle` (size rule lives here)

Vehicle is **immutable** (final fields) and owns the `canFitIn(SpotType)` method. Keeping the compatibility rule on the vehicle (and not the spot) means we have **one place to update** when business adds, say, a "BUS" type.

```java
public boolean canFitIn(SpotType spot) {
    case MOTORCYCLE: return true;                       // fits anywhere
    case CAR:        return spot != SpotType.MOTORCYCLE;
    case TRUCK:      return spot == SpotType.LARGE;
}
```

> This is **polymorphic behavior on an enum value** — cleaner than a sprawling `if/else` in `ParkingLot`.

---

### Step 5 — Build the `ParkingSpot` (atomic claim)

A spot can hold **at most one** vehicle. Two things make this thread-safe:

1. Every state-changing method is `synchronized` on the spot.
2. `park()` returns a **boolean** — `true` = claimed, `false` = already taken or wrong size.

```java
public synchronized boolean park(Vehicle v) {
    if (parkedVehicle != null) return false;
    if (!v.canFitIn(type))      return false;
    this.parkedVehicle = v;
    return true;
}
```

> The boolean is gold: it lets the caller **race-retry** without a lot-wide lock. Lot-wide lock = bottleneck during morning rush.

---

### Step 6 — Build the `Ticket`

A `Ticket` is a record of the visit:

- Created at entry with `UUID`, `vehicle`, `spot`, `entryTime`.
- Closed at exit by setting `exitTime` and `amountCharged`.

> UUID is used so ticket IDs **can't be guessed/forged** — important if it later becomes a QR code.

---

### Step 7 — Pricing as a Strategy

Defining `PricingStrategy` as an **interface with one method** (`calculate(Ticket) → double`) makes the rule pluggable.

The default `HourlyPricingStrategy`:
- Uses an `EnumMap<VehicleType, Double>` (array-backed, faster than `HashMap`).
- Rounds **partial hours UP** (`Math.ceil`) — same as real parking lots.
- Falls back to "current time" if `exitTime` is null (allows pre-checkout fare preview).

> Adding **weekend rates / EV discount** later = create a new class, **zero edits** elsewhere. That's the Open/Closed Principle.

---

### Step 8 — Spot Allocation as a Strategy

`SpotAllocationStrategy` decides **which** free spot a vehicle should occupy. We start with `NearestFirstAllocationStrategy` — a simple O(N) scan returning the first compatible free spot.

The list is **pre-sorted by distance from the entrance**, so "first match" = "nearest spot". Big lots can swap in a per-`SpotType` `Queue<ParkingSpot>` of free spots → O(1) allocation.

> Strategy interface = same code path, swap algorithm via constructor injection.

---

### Step 9 — `ParkingLot` Facade

The brain. Wires everything together with two public methods:

#### `park(vehicle)` — entry flow

1. Ask the **allocation strategy** for a candidate.
2. Try `spot.park(vehicle)`.
3. **If it raced** (another thread grabbed it), loop and try again — up to 5 attempts.
4. Once claimed, create a `Ticket` and store it in `ConcurrentHashMap<ticketId, Ticket>`.

```java
for (int attempt = 0; attempt < 5; attempt++) {
    ParkingSpot spot = allocation.findSpot(vehicle, spots).orElseThrow(...);
    if (spot.park(vehicle)) {       // atomic claim
        Ticket t = new Ticket(vehicle, spot);
        activeTickets.put(t.getTicketId(), t);
        return t;
    }
    // raced - try a different free spot
}
```

#### `unpark(ticketId)` — exit flow

1. `activeTickets.remove(id)` — **atomic** invalidation (same ticket can't be used twice).
2. Set `exitTime`.
3. Call `pricing.calculate(ticket)`.
4. `spot.free()`.

> The retry-loop pattern is the **secret sauce** that keeps the system both correct and high-throughput.

---

### Step 10 — Concurrency story

| Hazard | Protection |
|---|---|
| Two threads claim the same spot | `synchronized boolean park()` — only one wins |
| Two threads pick same spot from allocation | Retry loop in `ParkingLot.park()` |
| Same ticket used twice for exit | `ConcurrentHashMap.remove()` is atomic |
| Lot-wide bottleneck | **Avoided** — locks are per-spot, so 1000 spots ⇒ 1000 parallel parks |

> The interview answer to "what if 1000 cars enter at once?" is exactly this table.

---

### Step 11 — Demo proves it works

Building a tiny 7-spot lot and parking a bike, car, and truck verifies:

- **bike → M-1** (nearest motorcycle spot)
- **car → C-1** (skips M-spots by size rule)
- **truck → L-1** (only LARGE works)
- Car exits → charged **$20** (1-hour minimum), free spots go 4 → 5.

---

### Step 12 — How we'll extend it later

| Future Need | Hook |
|---|---|
| Multi-floor | `ParkingFloor` aggregating spots; `ParkingLot` aggregates floors |
| EV charging stalls | Add `chargerType` to `ParkingSpot`; new `EvAwareAllocationStrategy` |
| Reservation | Spot state enum (`FREE / RESERVED / OCCUPIED`) + `reserve(...)` |
| Payments | Decorator on `unpark` calling `PaymentGateway.charge(...)` |
| Persistence | Replace `activeTickets` map with a `TicketRepository` interface |
| Entry/Exit gate UI | `EntryGate.scan(vehicle)` → `lot.park(...)` (UI separated from domain) |
| Occupancy dashboard | Emit Kafka events on park/unpark; aggregate downstream |

---

> **Mental model:** Enums + `canFitIn` = size correctness · Per-spot lock + retry = race correctness · Strategy interfaces = pluggable behavior · Facade = clean public API.

---

## 1. Problem Statement

Design a parking lot system that:
- Supports **multiple vehicle types** (Motorcycle / Car / Truck) and **spot types** (Motorcycle / Compact / Large).
- A vehicle can occupy only a **compatible** spot (size-based polymorphism).
- Issues a **ticket** at entry, computes **fee** at exit.
- Pricing is **pluggable** (hourly, day-pass, tiered…).
- Allocation strategy is **pluggable** (nearest-first, random, by-floor…).
- **Thread-safe** under concurrent entries/exits.

---

## 2. Design Patterns Used

| Pattern | Reason |
|---|---|
| **Facade** | `ParkingLot` exposes simple `park` / `unpark` to the outside world |
| **Strategy** | `PricingStrategy` and `SpotAllocationStrategy` are interchangeable |
| **Polymorphism via enums** | `VehicleType.canFitIn(SpotType)` keeps size compatibility logic in one place |
| **Per-resource lock** | `synchronized` on each `ParkingSpot` allows N parallel parks across N spots |

---

## 3. Folder Layout

```
parkinglot/
├── ParkingLot.java                          ← Facade
├── Main.java                                ← Demo driver
├── model/
│   ├── VehicleType.java                     ← enum
│   ├── SpotType.java                        ← enum
│   ├── Vehicle.java
│   ├── ParkingSpot.java
│   └── Ticket.java
├── pricing/
│   ├── PricingStrategy.java                 ← strategy interface
│   └── HourlyPricingStrategy.java
└── allocation/
    ├── SpotAllocationStrategy.java          ← strategy interface
    └── NearestFirstAllocationStrategy.java
```

---

## 4. Step-by-Step Code Walkthrough

### Step 1 — Enums

Define vehicle/spot types as enums; they keep the model tight and let us write a clean fits-in compatibility table.

**File:** `src/main/java/parkinglot/model/VehicleType.java`

```java
package parkinglot.model;

public enum VehicleType {
    MOTORCYCLE,
    CAR,
    TRUCK
}
```

**File:** `src/main/java/parkinglot/model/SpotType.java`

```java
package parkinglot.model;

public enum SpotType {
    MOTORCYCLE,
    COMPACT,
    LARGE
}
```

---

### Step 2 — Vehicle

Immutable. Owns the **size compatibility** rule (`canFitIn`) — single place to change if rules evolve.

**File:** `src/main/java/parkinglot/model/Vehicle.java`

```java
package parkinglot.model;

public class Vehicle {

    private final String licensePlate;
    private final VehicleType type;

    public Vehicle(String licensePlate, VehicleType type) {
        this.licensePlate = licensePlate;
        this.type = type;
    }

    public String getLicensePlate() { return licensePlate; }
    public VehicleType getType()    { return type; }

    /** Can this vehicle fit into the given spot type? */
    public boolean canFitIn(SpotType spot) {
        switch (type) {
            case MOTORCYCLE: return true;                          // fits anywhere
            case CAR:        return spot != SpotType.MOTORCYCLE;   // not in bike spot
            case TRUCK:      return spot == SpotType.LARGE;        // only large
            default:         throw new IllegalStateException();
        }
    }
}
```

#### Compatibility table

| Vehicle ↓  /  Spot →     | MOTORCYCLE | COMPACT | LARGE |
|---|---|---|---|
| MOTORCYCLE | ✅ | ✅ | ✅ |
| CAR        | ❌ | ✅ | ✅ |
| TRUCK      | ❌ | ❌ | ✅ |

---

### Step 3 — ParkingSpot

A spot holds **at most one** vehicle. Every state-changing method is `synchronized` so two threads cannot park in the same spot.

**File:** `src/main/java/parkinglot/model/ParkingSpot.java`

```java
package parkinglot.model;

public class ParkingSpot {

    private final String spotId;
    private final SpotType type;
    private Vehicle parkedVehicle;        // null when free

    public ParkingSpot(String spotId, SpotType type) {
        this.spotId = spotId;
        this.type = type;
    }

    public String getSpotId() { return spotId; }
    public SpotType getType() { return type; }

    public synchronized boolean isFree() {
        return parkedVehicle == null;
    }

    public synchronized boolean park(Vehicle v) {
        if (parkedVehicle != null) return false;     // already occupied
        if (!v.canFitIn(type))      return false;    // wrong size
        this.parkedVehicle = v;
        return true;
    }

    public synchronized Vehicle free() {
        Vehicle v = parkedVehicle;
        parkedVehicle = null;
        return v;
    }

    public synchronized Vehicle getParkedVehicle() {
        return parkedVehicle;
    }
}
```

**Key insight:** `park()` returns `boolean` — the caller can race-retry if someone else grabbed the spot first.

---

### Step 4 — Ticket

Issued at entry, mutated at exit. UUID for uniqueness; entry/exit timestamps drive pricing.

**File:** `src/main/java/parkinglot/model/Ticket.java`

```java
package parkinglot.model;

import java.time.Instant;
import java.util.UUID;

public class Ticket {

    private final String ticketId;
    private final Vehicle vehicle;
    private final ParkingSpot spot;
    private final Instant entryTime;
    private Instant exitTime;          // null until vehicle exits
    private double amountCharged;

    public Ticket(Vehicle vehicle, ParkingSpot spot) {
        this.ticketId  = UUID.randomUUID().toString();
        this.vehicle   = vehicle;
        this.spot      = spot;
        this.entryTime = Instant.now();
    }

    public String getTicketId()       { return ticketId; }
    public Vehicle getVehicle()       { return vehicle; }
    public ParkingSpot getSpot()      { return spot; }
    public Instant getEntryTime()     { return entryTime; }
    public Instant getExitTime()      { return exitTime; }
    public double getAmountCharged()  { return amountCharged; }

    public void close(Instant exitTime, double amount) {
        this.exitTime = exitTime;
        this.amountCharged = amount;
    }
}
```

---

### Step 5 — Pricing Strategy

Pluggable. Adding new pricing (weekend rate, EV discount) = new class implementing this interface.

**File:** `src/main/java/parkinglot/pricing/PricingStrategy.java`

```java
package parkinglot.pricing;

import parkinglot.model.Ticket;

public interface PricingStrategy {
    double calculate(Ticket ticket);
}
```

---

### Step 6 — Hourly Pricing Implementation

Charges per-hour by vehicle type, rounded UP (so a 5-minute park still costs 1 hour — same as real lots).

**File:** `src/main/java/parkinglot/pricing/HourlyPricingStrategy.java`

```java
package parkinglot.pricing;

import parkinglot.model.Ticket;
import parkinglot.model.VehicleType;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;

public class HourlyPricingStrategy implements PricingStrategy {

    private final Map<VehicleType, Double> ratePerHour;

    public HourlyPricingStrategy() {
        ratePerHour = new EnumMap<>(VehicleType.class);
        ratePerHour.put(VehicleType.MOTORCYCLE, 10.0);
        ratePerHour.put(VehicleType.CAR,        20.0);
        ratePerHour.put(VehicleType.TRUCK,      40.0);
    }

    @Override
    public double calculate(Ticket ticket) {
        Instant exit = ticket.getExitTime() != null ? ticket.getExitTime() : Instant.now();
        long minutes = Math.max(1, Duration.between(ticket.getEntryTime(), exit).toMinutes());
        long hours = (long) Math.ceil(minutes / 60.0);
        double rate = ratePerHour.get(ticket.getVehicle().getType());
        return hours * rate;
    }
}
```

Why `EnumMap`? Faster than `HashMap` for enum keys (backed by an array).

---

### Step 7 — Spot Allocation Strategy

Pluggable rule for picking *which* free spot to give the vehicle.

**File:** `src/main/java/parkinglot/allocation/SpotAllocationStrategy.java`

```java
package parkinglot.allocation;

import parkinglot.model.ParkingSpot;
import parkinglot.model.Vehicle;

import java.util.List;
import java.util.Optional;

public interface SpotAllocationStrategy {
    Optional<ParkingSpot> findSpot(Vehicle vehicle, List<ParkingSpot> allSpots);
}
```

---

### Step 8 — Nearest-First Allocation

Simplest sensible default: scan spots in list order (the list is pre-sorted by distance from entrance) and return the first compatible free one.

**File:** `src/main/java/parkinglot/allocation/NearestFirstAllocationStrategy.java`

```java
package parkinglot.allocation;

import parkinglot.model.ParkingSpot;
import parkinglot.model.Vehicle;

import java.util.List;
import java.util.Optional;

public class NearestFirstAllocationStrategy implements SpotAllocationStrategy {

    @Override
    public Optional<ParkingSpot> findSpot(Vehicle vehicle, List<ParkingSpot> allSpots) {
        for (ParkingSpot spot : allSpots) {
            if (spot.isFree() && vehicle.canFitIn(spot.getType())) {
                return Optional.of(spot);
            }
        }
        return Optional.empty();
    }
}
```

**Note:** This is O(N) — fine for small lots. For large lots, keep a per-`SpotType` `Queue<ParkingSpot>` of free spots → O(1).

---

### Step 9 — `ParkingLot` Facade

Orchestrates the whole flow. Notice the **race-retry loop** in `park()` — that's how we stay correct when two threads target the same spot.

**File:** `src/main/java/parkinglot/ParkingLot.java`

```java
package parkinglot;

import parkinglot.allocation.SpotAllocationStrategy;
import parkinglot.model.ParkingSpot;
import parkinglot.model.Ticket;
import parkinglot.model.Vehicle;
import parkinglot.pricing.PricingStrategy;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class ParkingLot {

    private final List<ParkingSpot> spots;
    private final SpotAllocationStrategy allocation;
    private final PricingStrategy pricing;
    private final ConcurrentHashMap<String, Ticket> activeTickets = new ConcurrentHashMap<>();

    public ParkingLot(List<ParkingSpot> spots,
                      SpotAllocationStrategy allocation,
                      PricingStrategy pricing) {
        this.spots = new ArrayList<>(spots);
        this.allocation = allocation;
        this.pricing = pricing;
    }

    /** ENTRY: find a spot, claim it atomically, issue a ticket. */
    public Ticket park(Vehicle vehicle) {
        for (int attempt = 0; attempt < 5; attempt++) {
            Optional<ParkingSpot> candidate = allocation.findSpot(vehicle, spots);
            if (candidate.isEmpty()) {
                throw new IllegalStateException("Parking lot is full for " + vehicle.getType());
            }
            ParkingSpot spot = candidate.get();
            if (spot.park(vehicle)) {                // atomic claim
                Ticket ticket = new Ticket(vehicle, spot);
                activeTickets.put(ticket.getTicketId(), ticket);
                return ticket;
            }
            // someone else took it between findSpot and park -> retry
        }
        throw new IllegalStateException("Failed to park after retries (high contention)");
    }

    /** EXIT: compute fare, free the spot, close ticket. */
    public Ticket unpark(String ticketId) {
        Ticket ticket = activeTickets.remove(ticketId);
        if (ticket == null) {
            throw new NoSuchElementException("Invalid ticket: " + ticketId);
        }
        Instant exit = Instant.now();
        ticket.close(exit, 0);                       // set exit time first
        double amount = pricing.calculate(ticket);
        ticket.close(exit, amount);
        ticket.getSpot().free();
        return ticket;
    }

    public long countFreeSpots() {
        return spots.stream().filter(ParkingSpot::isFree).count();
    }
}
```

#### `park()` flow

| Step | Action | Why |
|---|---|---|
| 1 | `allocation.findSpot()` | Strategy decides candidate |
| 2 | `spot.park()` returns boolean | Atomic claim — fails if a racer grabbed it |
| 3 | Retry up to 5 times | Handle high contention without deadlocks |
| 4 | Create ticket + add to map | `ConcurrentHashMap.put` |

#### `unpark()` flow

| Step | Action | Why |
|---|---|---|
| 1 | `activeTickets.remove(id)` | Atomic invalidation — same ticket can’t exit twice |
| 2 | `pricing.calculate(ticket)` | Strategy-driven fare |
| 3 | `ticket.close(...)` | Record exit time + amount |
| 4 | `spot.free()` | Make spot available again |

---

### Step 10 — Demo Driver

**File:** `src/main/java/parkinglot/Main.java`

```java
package parkinglot;

import parkinglot.allocation.NearestFirstAllocationStrategy;
import parkinglot.model.ParkingSpot;
import parkinglot.model.SpotType;
import parkinglot.model.Ticket;
import parkinglot.model.Vehicle;
import parkinglot.model.VehicleType;
import parkinglot.pricing.HourlyPricingStrategy;

import java.util.ArrayList;
import java.util.List;

public class Main {

    public static void main(String[] args) {
        List<ParkingSpot> spots = new ArrayList<>();
        spots.add(new ParkingSpot("M-1", SpotType.MOTORCYCLE));
        spots.add(new ParkingSpot("M-2", SpotType.MOTORCYCLE));
        spots.add(new ParkingSpot("C-1", SpotType.COMPACT));
        spots.add(new ParkingSpot("C-2", SpotType.COMPACT));
        spots.add(new ParkingSpot("C-3", SpotType.COMPACT));
        spots.add(new ParkingSpot("L-1", SpotType.LARGE));
        spots.add(new ParkingSpot("L-2", SpotType.LARGE));

        ParkingLot lot = new ParkingLot(
                spots,
                new NearestFirstAllocationStrategy(),
                new HourlyPricingStrategy());

        Vehicle bike  = new Vehicle("KA-01-B-1111", VehicleType.MOTORCYCLE);
        Vehicle car   = new Vehicle("KA-01-C-2222", VehicleType.CAR);
        Vehicle truck = new Vehicle("KA-01-T-3333", VehicleType.TRUCK);

        Ticket t1 = lot.park(bike);
        Ticket t2 = lot.park(car);
        Ticket t3 = lot.park(truck);

        System.out.println("Parked bike  at " + t1.getSpot().getSpotId());
        System.out.println("Parked car   at " + t2.getSpot().getSpotId());
        System.out.println("Parked truck at " + t3.getSpot().getSpotId());
        System.out.println("Free spots remaining: " + lot.countFreeSpots());

        Ticket out = lot.unpark(t2.getTicketId());
        System.out.println("Car exited. Charged: $" + out.getAmountCharged());
        System.out.println("Free spots remaining: " + lot.countFreeSpots());
    }
}
```

**Verified output:**
```
Parked bike  at M-1
Parked car   at C-1
Parked truck at L-1
Free spots remaining: 4
Car exited. Charged: $20.0  (minimum 1 hour rounded up)
Free spots remaining: 5
```

Notes from the output:
- **bike → M-1** (nearest motorcycle spot).
- **car → C-1** (skips M-spots because of size rule).
- **truck → L-1** (only LARGE works).
- After car exits, 4 → 5 free.

---

## 5. Concurrency & Race Conditions

| Hazard | Where | Protection |
|---|---|---|
| Two threads parking in the same spot | `ParkingSpot.park` | `synchronized` + `boolean` return |
| Two threads picking same spot from allocation | `ParkingLot.park` loop | Retry on `park()` returning false |
| Same ticket used twice for exit | `ParkingLot.unpark` | `ConcurrentHashMap.remove` (atomic) |
| Counter races on `hitCount` etc. | n/a here | Each spot lock is independent — N parallel parks across N spots |

**Why per-spot lock and not a lot-wide lock?** Lot-wide lock serializes ALL entries — would not scale to a 10,000-spot lot during morning rush.

---

## 6. Extensibility

| Future Need | How to add |
|---|---|
| New pricing (day pass, EV discount) | Implement `PricingStrategy` — no service changes |
| New allocation (random, by floor, EV charger-aware) | Implement `SpotAllocationStrategy` |
| Multi-floor lots | `ParkingFloor` aggregating spots; `ParkingLot` aggregates floors |
| Reservation system | Add `reserve(spotId, until)` on `ParkingSpot` + state enum (FREE/RESERVED/OCCUPIED) |
| Persistence | Replace `activeTickets` map with a `TicketRepository` interface |
| Payment | Decorator on `unpark` → `PaymentGateway.charge(...)` |
| Entry/Exit gates | Expose `EntryGate.scan(vehicle)` calling `lot.park()` (UI separation) |

---

## 7. SOLID Compliance

- **S**ingle Responsibility — `ParkingSpot` only tracks spot state; `Ticket` only records the visit; `Pricing/Allocation` strategies handle their own logic.
- **O**pen/Closed — add new vehicle/spot type, pricing, or allocation without modifying `ParkingLot`.
- **L**iskov — every strategy implementation is fully substitutable.
- **I**nterface Segregation — strategies are 1-method interfaces.
- **D**ependency Inversion — `ParkingLot` depends on `PricingStrategy` + `SpotAllocationStrategy` (abstractions), wired in via constructor.

---

### How to Run

```bash
mvn -q compile
mvn -q exec:java -Dexec.mainClass=parkinglot.Main
```
