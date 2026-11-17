#!/usr/bin/env python3
"""Writes sample.js and sample-play.js, the data the home page's app preview draws, from the app's own sample projects.

The app keeps each sample as a JSON plan inside a Swift file, generated there from Wilde's public-domain text:
  Core/SampleStory.swift  (The Canterville Ghost, the sample novel)
  Core/SamplePlay.swift   (The Importance of Being Earnest, the sample play)
This reads that JSON straight out of the Swift source (nothing is built or run in the app's repository) and keeps what the
preview shows: the chapters or acts and their scenes, each scene's text, links, status, time and comments, the Story
entries, the notes' titles, the goal and the writing history.

Run it from the site's folder, with the app's repository as the argument:
  python3 tools/make-samples.py ../rozdzial
"""
import json
import re
import sys
from pathlib import Path


def plan(swift: Path) -> tuple[dict, str]:
    source = swift.read_text(encoding="utf-8")
    body = re.search(r'private static let source = #"""\n(.*?)\n"""#', source, re.S)
    if not body:
        sys.exit(f"No sample plan in {swift}")
    note = re.search(r'public static let versionNote = "(.*?)"', source)
    return json.loads(body.group(1)), note.group(1)


def word_count(text: str) -> int:
    """Words as the app counts them (Core/WordCount.swift, the system's word breaker): letters and digits with the
    apostrophes, full stops and commas inside them, a hyphenated word once, an em dash between two words."""
    words = re.findall(r"\w+(?:[.,:’']\w+)*", text)
    joins = len(re.findall(r"(?<=[\w’'.])[-‐](?=[\w’'])", text))
    return len(words) - joins


def entry_index(entries: list[dict]) -> dict[str, int]:
    return {e["key"]: i for i, e in enumerate(entries)}


def common(data: dict, units: list[dict]) -> dict:
    chars, arcs, places = entry_index(data["characters"]), entry_index(data["arcs"]), entry_index(data["locations"])
    progress = data["progress"]
    return {
        "characters": [{"name": c["name"], "role": c.get("role") or "", "color": c.get("color") or 0} for c in data["characters"]],
        "arcs": [{"name": a["name"], "color": a.get("color") or 0} for a in data["arcs"]],
        "locations": [l["name"] for l in data["locations"]],
        "notes": [n["title"] for n in data["notes"]] + ["Source & credits"],
        "goal": progress["goalWords"],
        "dailyWords": progress["dailyWords"],
        "history": [[d["daysAgo"], d["net"]] for d in progress["history"]],
        "keys": (chars, arcs, places),
    }


def scene_links(scene: dict, keys) -> dict:
    chars, arcs, places = keys
    return {
        "id": scene["key"],
        "title": scene["title"],
        "synopsis": scene["synopsis"],
        "status": scene["status"],
        "time": scene["time"],
        # Chips and avatars list a scene's entries in the Story list's order, as the app does.
        "chars": sorted(chars[k] for k in scene["characters"]),
        "arcs": sorted(arcs[k] for k in scene["arcs"]),
        "location": places.get(scene["location"]) if scene.get("location") else None,
        "comments": [{"quote": c["quote"], "text": c["text"]} for c in scene["comments"]],
    }


def novel(app: Path) -> dict:
    data, note = plan(app / "Core/SampleStory.swift")
    out = common(data, data["chapters"])
    keys = out.pop("keys")
    out.update({"form": "novel", "title": "The Canterville Ghost", "versionNote": note, "chapters": []})
    for chapter in data["chapters"]:
        scenes = []
        for s in chapter["scenes"]:
            scene = scene_links(s, keys)
            scene["pov"] = s["pointOfView"]
            text = "\n".join(p["text"] for p in s["paragraphs"])
            scene["words"] = word_count(text)
            # [text, italic spans as [start, length] in UTF-16 units, 1 when set in as a block, 1 when unindented]
            scene["paragraphs"] = [[p["text"], [[i["location"], i["length"]] for i in p["italics"]], int(p["indented"]), int(p["noIndent"])]
                                   for p in s["paragraphs"]]
            scenes.append(scene)
        out["chapters"].append({"title": chapter["title"], "scenes": scenes})
    return out


ROLES = {"characterName": "n", "dialogue": "d", "parenthetical": "p", "direction": "s", "transition": "t", "verse": "v", "lyric": "l", "heading": "h"}


def play(app: Path) -> dict:
    data, note = plan(app / "Core/SamplePlay.swift")
    out = common(data, data["acts"])
    keys = out.pop("keys")
    title_page = next(n for n in data["notes"] if n["title"] == "Title page")["paragraphs"]
    out.update({"form": "play", "title": "The Importance of Being Earnest", "versionNote": note, "pageTarget": data["pageTarget"],
                "titlePage": title_page, "acts": []})
    out["characters"] = [dict(c, scriptName=src.get("scriptName") or "") for c, src in zip(out["characters"], data["characters"])]
    for act in data["acts"]:
        scenes = []
        for s in act["scenes"]:
            scene = scene_links(s, keys)
            scene["words"] = word_count("\n".join(p["text"] for p in s["paragraphs"]))
            # [role, text, italic spans]: n name, d dialogue, p parenthetical, s stage direction, t transition
            scene["paragraphs"] = [[ROLES[p["role"]], p["text"]] + ([[[i["location"], i["length"]] for i in p["italics"]]] if p["italics"] else [])
                                   for p in s["paragraphs"]]
            scenes.append(scene)
        out["acts"].append({"title": act["title"], "scenes": scenes})
    return out


def write(path: Path, name: str, header: str, value: dict) -> None:
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    path.write_text(f"{header}\nwindow.{name} = {text};\n", encoding="utf-8")


def main() -> None:
    app = Path(sys.argv[1] if len(sys.argv) > 1 else "../rozdzial").expanduser()
    site = Path(__file__).resolve().parent.parent
    write(site / "sample.js", "SAMPLE",
          "// Generated by tools/make-samples.py from the app's Core/SampleStory.swift: the sample novel that ships with the app.\n"
          "// Text: Oscar Wilde, The Canterville Ghost (1906), Project Gutenberg eBook #14522. Public domain in the USA.\n"
          "// Scene titles, synopses, links, statuses and comments are the sample's annotations, not Wilde's.", novel(app))
    write(site / "sample-play.js", "SAMPLE_PLAY",
          "// Generated by tools/make-samples.py from the app's Core/SamplePlay.swift: the sample play that ships with the app.\n"
          "// Text: Oscar Wilde, The Importance of Being Earnest (1895), Project Gutenberg eBook #844. Public domain in the USA.\n"
          "// Scene divisions, titles, synopses, links, statuses and comments are the sample's annotations, not Wilde's.", play(app))


if __name__ == "__main__":
    main()
