#!/bin/bash

set -eo pipefail

script_name="${0##*/}"
script_options="cghiy"
repo_dir="lib/vscode-csharp-parsing"
repo_url="git@github.com:kokoabim/vscode-csharp-parsing.git"

function usage() {
    end "Git pull lib repos

Use: $script_name [-$script_options]

Switches:
 -c  Clean project by removing all build files and directories
 -g  If missing, git clone the repo into ./lib directory and create symlink
 -h  View this help
 -i  Perform NPM install after git pull
 -y  Confirm yes to run
"
}

function end() {
    local e=$? || :
    set +e
    trap - EXIT SIGHUP SIGINT SIGQUIT SIGTERM

    local end_message="$1"
    local end_code=${2:-$e}

    [[ "$end_message" != "" ]] && echo "$end_message"
    exit $end_code
}

trap end SIGHUP SIGINT SIGQUIT SIGTERM

function confirm_run() {
    [[ ${yes:-0} -eq 1 ]] && return

    read -p "${1:-Continue}? [y/N] " -n 1
    [[ $REPLY == "" ]] && echo -en "\033[1A"
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || end
}

clean=0
confirm_text="Git pull lib repo"
git_clone=0
npm_install=0
yes=0

while getopts "$script_options" OPTION; do
    case "$OPTION" in
    c) clean=1 ;;
    g)
        confirm_text="Git clone lib repo and create symlink"
        git_clone=1
        ;;
    h) usage ;;
    i) npm_install=1 ;;
    y) yes=1 ;;
    *) usage ;;
    esac
done
shift $(($OPTIND - 1))

confirm_run "$confirm_text"

if [[ $git_clone == 1 ]]; then
    if [[ ! -d $repo_dir ]]; then
        mkdir -p lib
        git clone "$repo_url" "$repo_dir"
    else
        echo "Repo already exists"
    fi

    if [[ ! -L ./src/CSharp ]]; then
        pushd src >/dev/null
        ln -s "../$repo_dir/src/CSharp"
        popd >/dev/null
        echo "Symlink created"
    else
        echo "Symlink already exists"
    fi
else
    pushd lib >/dev/null

    ls -d */ | sed 's/\/$//' | while read -r repo; do
        echo "Repo: $repo"
        pushd $repo >/dev/null

        git_fetch="$(git fetch)"
        git_status="$(git status)"

        if [[ "$git_status" == *"branch is behind"* ]]; then
            echo "Pulling..."
            git pull
        fi

        if [[ $clean == 1 ]]; then
            ./clean.sh -y
        fi

        if [[ $npm_install == 1 ]]; then
            echo "Installing NPM packages..."
            npm install
        fi

        popd >/dev/null
    done

    popd >/dev/null
fi
