#!/bin/bash

set -eo pipefail

script_name="${0##*/}"
script_options="chiy"

function usage() {
    end "Git pull lib repos

Use: $script_name [-$script_options]

Switches:
 -c  Clean project by removing all build files and directories
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
npm_install=0
yes=0

while getopts "$script_options" OPTION; do
    case "$OPTION" in
    c) clean=1 ;;
    h) usage ;;
    i) npm_install=1 ;;
    y) yes=1 ;;
    *) usage ;;
    esac
done
shift $(($OPTIND - 1))

confirm_run "Git pull lib repos"

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
