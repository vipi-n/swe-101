from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = ROOT / "site"
CONTENT_ROOTS = (
    "hld",
    "lld",
    "java",
    "springboot",
    "kafka",
    "networking",
    "docker-k8s",
    "qna",
)
CATEGORY_ORDER = {
    "hld": 0,
    "lld": 1,
    "java": 2,
    "springboot": 3,
    "kafka": 4,
    "networking": 5,
    "docker-k8s": 6,
    "qna": 7,
}
CATEGORY_LABELS = {
    "hld": "High-level design",
    "lld": "Low-level design",
    "java": "Java",
    "springboot": "Spring Boot",
    "kafka": "Kafka",
    "networking": "Networking",
    "docker-k8s": "Docker and Kubernetes",
    "qna": "Interview Q&A",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the swe-101 static documentation site.")
    parser.add_argument("--dist", default="_site", help="Output directory for the generated site.")
    args = parser.parse_args()

    dist = (ROOT / args.dist).resolve()
    if dist == ROOT or ROOT not in dist.parents:
        raise SystemExit("The output directory must be inside the repository.")

    if dist.exists():
        shutil.rmtree(dist)

    shutil.copytree(SITE_DIR, dist)
    docs = discover_docs()
    write_content(dist, docs)
    write_manifest(dist, docs)
    print(f"Built {len(docs)} notes into {dist}")


def discover_docs() -> list[dict[str, str]]:
    docs: list[dict[str, str]] = []
    for root_name in CONTENT_ROOTS:
        content_root = ROOT / root_name
        if not content_root.exists():
            continue

        for path in sorted(content_root.rglob("*.md")):
            rel_path = path.relative_to(ROOT).as_posix()
            text = path.read_text(encoding="utf-8")
            docs.append(
                {
                    "id": rel_path,
                    "path": rel_path,
                    "category": root_name,
                    "categoryLabel": CATEGORY_LABELS.get(root_name, titleize(root_name)),
                    "tier": extract_tier(rel_path),
                    "title": extract_title(text, path),
                    "description": extract_description(text),
                }
            )

    docs.sort(key=sort_key)
    return docs


def write_content(dist: Path, docs: list[dict[str, str]]) -> None:
    content_dist = dist / "content"
    for doc in docs:
        source = ROOT / doc["path"]
        target = content_dist / doc["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def write_manifest(dist: Path, docs: list[dict[str, str]]) -> None:
    categories = sorted({doc["category"] for doc in docs}, key=lambda item: CATEGORY_ORDER.get(item, 99))
    manifest = {
        "site": {
            "name": "swe-101",
            "description": "System design and interview preparation notes.",
            "source": "https://github.com/vipi-n/swe-101",
        },
        "categories": categories,
        "docs": docs,
    }
    (dist / "content-manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def extract_title(text: str, path: Path) -> str:
    for line in text.splitlines():
        match = re.match(r"^#\s+(.+?)\s*$", line)
        if match:
            return clean_inline_markdown(match.group(1))
    return titleize(path.stem)


def extract_description(text: str) -> str:
    in_fence = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence or not line or line.startswith("#") or line.startswith("|") or line.startswith("-"):
            continue
        if re.match(r"^\d+\.", line):
            continue
        description = clean_inline_markdown(line)
        if description:
            return truncate(description, 150)
    return ""


def extract_tier(rel_path: str) -> str:
    if not rel_path.startswith("hld/"):
        return ""
    for tier in ("tier-1", "tier-2", "tier-3"):
        if f"/{tier}/" in f"/{rel_path}":
            return tier
    return ""


def clean_inline_markdown(value: str) -> str:
    value = re.sub(r"`([^`]+)`", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"[*_~>#]", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return value[: limit - 1].rstrip() + "..."


def titleize(value: str) -> str:
    return re.sub(r"[-_]+", " ", value).strip().title()


def sort_key(doc: dict[str, str]) -> tuple[int, str, str]:
    return (
        CATEGORY_ORDER.get(doc["category"], 99),
        doc["path"].count("/"),
        doc["title"].lower(),
    )


if __name__ == "__main__":
    main()
