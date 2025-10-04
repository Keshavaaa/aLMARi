import os

# --- Directories to Exclude ---
# You can add or remove from this list
EXCLUDE_DIRS = {
    "__pycache__",
    "node_modules",
    "venv",
    ".venv",
    ".git",
    "dist",
    "build",
    ".vscode",
}

def generate_filtered_tree(startpath):
    """Creates a filtered text representation of a directory tree."""
    tree_string = ""
    for root, dirs, files in os.walk(startpath, topdown=True):
        # Exclude specified directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        tree_string += f"{indent}{os.path.basename(root)}/\n"
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            tree_string += f"{subindent}{f}\n"
    return tree_string

if __name__ == "__main__":
    project_path = os.path.dirname(os.path.abspath(__file__))
    tree_output = generate_filtered_tree(project_path)
    
    # Save the output to a file
    with open("filtered_tree.txt", "w") as f:
        f.write(tree_output)
        
    print("Filtered project structure saved to filtered_tree.txt")

