use serde::Serialize;
use std::path::Path;
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    pub root: String,
    pub branch: String,
    pub worktree: bool,
}
fn small_text(path: &Path) -> Option<String> {
    if std::fs::metadata(path).ok()?.len() > 4096 {
        return None;
    }
    std::fs::read_to_string(path).ok()
}
pub fn git_info(directory: &Path) -> Option<GitInfo> {
    for root in directory.ancestors().take(20) {
        let dot = root.join(".git");
        let git_file = dot.is_file();
        let git = if git_file {
            let text = small_text(&dot)?;
            let relative = text.trim().strip_prefix("gitdir: ")?;
            if relative.starts_with("\\\\") || relative.starts_with("//") {
                return None;
            }
            root.join(relative)
        } else if dot.is_dir() {
            dot
        } else {
            continue;
        };
        let worktree = git_file && git.join("commondir").is_file();
        let head = small_text(&git.join("HEAD"))?;
        let head = head.trim();
        let branch = if let Some(branch) = head.strip_prefix("ref: refs/heads/") {
            branch.to_string()
        } else if head.len() >= 7 && head.chars().all(|c| c.is_ascii_hexdigit()) {
            format!("Detached {}", &head[..7])
        } else {
            return None;
        };
        return Some(GitInfo {
            root: root.to_string_lossy().into(),
            branch,
            worktree,
        });
    }
    None
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn nested_projects_and_linked_worktrees_keep_distinct_roots() {
        let root = std::env::temp_dir().join(format!("portwhim-git-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(root.join("main/.git/worktrees/feature")).unwrap();
        std::fs::create_dir_all(root.join("main/apps/web")).unwrap();
        std::fs::create_dir_all(root.join("feature/apps/web")).unwrap();
        std::fs::write(root.join("main/.git/HEAD"), "ref: refs/heads/main\n").unwrap();
        std::fs::write(
            root.join("main/.git/worktrees/feature/HEAD"),
            "ref: refs/heads/feature/ui\n",
        )
        .unwrap();
        std::fs::write(
            root.join("feature/.git"),
            "gitdir: ../main/.git/worktrees/feature\n",
        )
        .unwrap();
        std::fs::write(
            root.join("main/.git/worktrees/feature/commondir"),
            "../..\n",
        )
        .unwrap();
        let main = git_info(&root.join("main/apps/web")).unwrap();
        let feature = git_info(&root.join("feature/apps/web")).unwrap();
        assert_eq!(main.branch, "main");
        assert_eq!(feature.branch, "feature/ui");
        assert_ne!(main.root, feature.root);
        assert!(feature.worktree);
        std::fs::write(root.join("feature/.git"), "gitdir: //remote/share\n").unwrap();
        assert!(git_info(&root.join("feature")).is_none());
        std::fs::remove_dir_all(root).unwrap();
    }
}
