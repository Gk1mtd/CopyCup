#!/bin/bash

# Select the target directory where the files/folders will be copied
target_dir=$(zenity --file-selection --directory --title="Select Target Directory")

# Show an entry dialog to input or paste file paths
paths=$(zenity --entry --title="File Paths" --text="Enter or paste file paths (separated by spaces):")

# Copy the inputted/pasted files/folders to the target directory
if [[ -n "$paths" ]]; then
    for path in $paths; do
        cp -r "$path" "$target_dir/"
    done
fi

zenity --info --text="Files copied successfully to: $target_dir"
