---
name: git
description: |
  Use Git for version control operations.
  Use when: managing repositories, branches, commits, merges, rebases, and history inspection.
---

# Git

## Instructions
Use Git for version control operations including cloning repositories, managing branches, committing changes, inspecting history, and collaborating with remotes.

USAGE
  git <command> [<args>] [flags]

CORE COMMANDS
  init:        Create an empty Git repository or reinitialize an existing one
  clone:       Clone a repository into a new directory
  add:         Add file contents to the index (staging area)
  commit:      Record changes to the repository
  status:      Show the working tree status
  diff:        Show changes between commits, commit and working tree, etc.
  log:         Show commit logs
  push:        Update remote refs along with associated objects
  pull:        Fetch from and integrate with another repository or local branch
  fetch:       Download objects and refs from another repository

BRANCHING COMMANDS
  branch:      List, create, or delete branches
  checkout:    Switch branches or restore working tree files
  switch:      Switch branches
  merge:       Join two or more development histories together
  rebase:      Reapply commits on top of another base tip
  cherry-pick: Apply the changes introduced by some existing commits

INSPECTION COMMANDS
  show:        Show various types of objects
  blame:       Show what revision and author last modified each line of a file
  bisect:      Use binary search to find the commit that introduced a bug
  reflog:      Manage reflog information
  shortlog:    Summarize git log output

STASHING COMMANDS
  stash:       Stash the changes in a dirty working directory away

REMOTE COMMANDS
  remote:      Manage set of tracked repositories

TAGGING COMMANDS
  tag:         Create, list, delete, or verify a tag object signed with GPG

CONFIGURATION
  config:      Get and set repository or global options

FLAGS
  --help       Show help for command
  --version    Show git version

EXAMPLES
  $ git clone https://github.com/user/repo.git
  $ git checkout -b feature/new-branch
  $ git add . && git commit -m "feat: add new feature"
  $ git log --oneline --graph
  $ git stash && git pull --rebase && git stash pop
  $ git diff HEAD~3..HEAD
  $ git tag -a v1.0.0 -m "Release v1.0.0"

LEARN MORE
  Use `git <command> --help` for more information about a command.
  Read the manual at https://git-scm.com/doc
