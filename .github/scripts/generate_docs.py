#!/usr/bin/env python3
"""
Extracts @moduledoc content from Elixir source files and generates Markdown.
Usage:
  python generate_docs.py functions <src_dir> <output_file>
  python generate_docs.py variables <src_dir> <output_file>
"""

import os
import re
import sys


def extract_module_name(content):
    match = re.search(r'defmodule\s+\S+\.(\w+)\s+do', content)
    return match.group(1) if match else None


def extract_moduledoc(content):
    # Heredoc: @moduledoc """..."""
    match = re.search(r'@moduledoc\s+"""\n(.*?)"""', content, re.DOTALL)
    if match:
        return match.group(1).strip()
    # Single-line: @moduledoc "..."
    match = re.search(r'@moduledoc\s+"(.*?)"', content)
    if match:
        return match.group(1)
    return None


def generate_docs(directory, mode):
    entries = []
    for filename in sorted(os.listdir(directory)):
        if not filename.endswith('.ex'):
            continue
        with open(os.path.join(directory, filename)) as f:
            content = f.read()
        name = extract_module_name(content)
        doc = extract_moduledoc(content)
        if not name or not doc:
            continue
        if mode == 'functions':
            heading = f'### "{name}"'
            separator = '---'
        else:
            heading = f'### `${name}`'
            separator = '----'
        entries.append(f'{heading}\n\n{doc}\n{separator}')
    return '\n\n'.join(entries)


if __name__ == '__main__':
    mode, src_dir, output_file = sys.argv[1], sys.argv[2], sys.argv[3]
    docs = generate_docs(src_dir, mode)
    with open(output_file, 'w') as f:
        f.write(docs)
    print(f'Written to {output_file}')
