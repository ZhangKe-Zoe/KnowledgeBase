# Git & GitHub 工作流程

## 基础操作

### 克隆仓库
```bash
git clone https://github.com/username/repo.git
cd repo
```

### 日常提交流程
```bash
git status              # 查看状态
git add .              # 添加所有修改
git commit -m "描述"    # 提交
git push origin main   # 推送到远程
```

---

## 📤 本地仓库上传到 GitHub（重要）

### 场景一：已有本地项目，首次上传

**步骤 1：在本地初始化 Git 仓库**
```bash
cd /path/to/your/project   # 进入项目目录
git init                    # 初始化 Git 仓库
```

**步骤 2：添加文件并提交**
```bash
git add .                          # 添加所有文件
git commit -m "Initial commit"     # 第一次提交
```

**步骤 3：在 GitHub 创建远程仓库**
- 登录 GitHub 网页
- 点击右上角 `+` → `New repository`
- 填写仓库名称（如：my-project）
- **不要**勾选 "Initialize with README"（重要！）
- 点击 `Create repository`

**步骤 4：关联远程仓库**
```bash
# 添加远程仓库地址（复制 GitHub 页面提供的地址）
git remote add origin https://github.com/username/my-project.git

# 查看远程仓库
git remote -v
```

**步骤 5：推送到远程**
```bash
# 首次推送（设置上游分支）
git push -u origin main

# 如果默认分支是 master，使用：
git push -u origin master

# 或者重命名分支为 main
git branch -M main
git push -u origin main
```

**完整命令汇总**：
```bash
cd /path/to/your/project
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/repo.git
git branch -M main
git push -u origin main
```

---

### 场景二：克隆后修改再上传

```bash
# 克隆仓库
git clone https://github.com/username/repo.git
cd repo

# 修改文件后
git add .
git commit -m "更新说明"
git push origin main
```

---

### 场景三：已有本地仓库，更换远程地址

```bash
# 查看当前远程地址
git remote -v

# 移除旧的远程地址
git remote remove origin

# 添加新的远程地址
git remote add origin https://github.com/username/new-repo.git

# 推送
git push -u origin main
```

---

## 🔧 常见问题处理

### 问题 1：推送时提示 "fatal: remote origin already exists"

**原因**：已经添加过远程仓库

**解决**：
```bash
# 方法 1：先删除再添加
git remote remove origin
git remote add origin https://github.com/username/repo.git

# 方法 2：直接修改
git remote set-url origin https://github.com/username/repo.git
```

### 问题 2：推送被拒绝 "Updates were rejected"

**原因**：远程有本地没有的提交（通常是 README 或 License）

**解决**：
```bash
# 先拉取远程内容
git pull origin main --allow-unrelated-histories

# 解决冲突后提交
git add .
git commit -m "合并远程仓库"

# 再推送
git push origin main
```

### 问题 3：分支名称不匹配（master vs main）

**原因**：Git 新版本默认分支是 main，老版本是 master

**解决**：
```bash
# 查看当前分支
git branch

# 重命名分支
git branch -M main

# 推送
git push -u origin main
```

### 问题 4：推送时需要输入用户名密码

**原因**：使用 HTTPS 协议

**解决方案 A - 使用 Personal Access Token（推荐）**：
1. GitHub 网页：Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 `Generate new token`
3. 勾选 `repo` 权限
4. 复制生成的 token（只显示一次！）
5. 推送时用 token 替代密码

**解决方案 B - 配置凭据缓存**：
```bash
# Windows
git config --global credential.helper wincred

# macOS
git config --global credential.helper osxkeychain

# Linux
git config --global credential.helper store
```

**解决方案 C - 使用 SSH（更安全）**：
```bash
# 1. 生成 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. 复制公钥
cat ~/.ssh/id_ed25519.pub

# 3. 添加到 GitHub：Settings → SSH and GPG keys → New SSH key

# 4. 测试连接
ssh -T git@github.com

# 5. 修改远程地址为 SSH
git remote set-url origin git@github.com:username/repo.git
```

---

## 📋 SOP：本地项目首次上传标准流程

### ✅ 检查清单

**上传前**：
- [ ] 确认项目代码已完成测试
- [ ] 删除敏感信息（密码、密钥、token）
- [ ] 创建 `.gitignore` 文件排除不必要文件
- [ ] 准备好 README.md 说明文档

**`.gitignore` 示例**：
```gitignore
# Python
__pycache__/
*.pyc
*.pyo
venv/
.env

# C++
*.o
*.out
*.exe
build/
cmake-build-*/

# ROS
devel/
build/
install/
log/

# IDE
.vscode/
.idea/
*.swp
*.swo

# 系统文件
.DS_Store
Thumbs.db

# 日志和临时文件
*.log
tmp/
temp/

# 大文件和模型
*.pth
*.onnx
*.weights
*.h5
```

### 🚀 执行步骤

```bash
# 1. 初始化（在项目根目录）
git init

# 2. 创建 .gitignore
touch .gitignore
# （编辑 .gitignore 添加要忽略的文件）

# 3. 添加文件
git add .

# 4. 查看状态（确认要提交的文件）
git status

# 5. 首次提交
git commit -m "Initial commit: 项目初始化"

# 6. 在 GitHub 创建空仓库（网页操作）

# 7. 关联远程仓库
git remote add origin https://github.com/username/repo.git

# 8. 重命名分支（如果需要）
git branch -M main

# 9. 推送到远程
git push -u origin main

# 10. 验证（刷新 GitHub 页面查看）
```

### 🎯 后续更新流程

```bash
# 日常开发流程
git add .
git commit -m "feat: 添加新功能"
git push

# 或者详细一点
git status                    # 查看修改
git add specific-file.py     # 添加特定文件
git commit -m "fix: 修复bug"  # 提交
git push origin main         # 推送
```

---

## 💡 提交信息规范

使用语义化提交信息：

```bash
git commit -m "feat: 添加用户登录功能"
git commit -m "fix: 修复数据库连接错误"
git commit -m "docs: 更新 README 文档"
git commit -m "style: 代码格式化"
git commit -m "refactor: 重构用户模块"
git commit -m "test: 添加单元测试"
git commit -m "chore: 更新依赖包"
```

**类型说明**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建/工具/依赖更新
- `perf`: 性能优化

---

## 分支管理

### 创建和切换分支
```bash
git branch feature-x      # 创建分支
git checkout feature-x    # 切换分支
# 或者合并为一步
git checkout -b feature-x
```

### 查看分支
```bash
git branch        # 查看本地分支
git branch -a     # 查看所有分支（包括远程）
git branch -r     # 只查看远程分支
```

### 合并分支
```bash
git checkout main        # 切换到主分支
git merge feature-x      # 合并 feature-x 到 main
```

### 删除分支
```bash
git branch -d feature-x         # 删除本地分支（安全删除）
git branch -D feature-x         # 强制删除本地分支
git push origin --delete feature-x  # 删除远程分支
```

---

## 协作开发

### Fork 工作流

**步骤 1：Fork 仓库**
- 在 GitHub 页面点击 `Fork` 按钮
- Fork 到自己的账户下

**步骤 2：克隆到本地**
```bash
git clone https://github.com/your-username/repo.git
cd repo
```

**步骤 3：添加上游仓库**
```bash
git remote add upstream https://github.com/original-owner/repo.git
git remote -v  # 验证
```

**步骤 4：同步上游更新**
```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

**步骤 5：创建功能分支并开发**
```bash
git checkout -b feature-name
# 进行开发...
git add .
git commit -m "feat: 新功能描述"
git push origin feature-name
```

**步骤 6：创建 Pull Request**
- 在 GitHub 页面点击 `Pull Request`
- 选择要合并的分支
- 填写 PR 描述
- 提交等待审核

---

## 版本标签管理

### 创建标签
```bash
# 轻量标签
git tag v1.0.0

# 附注标签（推荐）
git tag -a v1.0.0 -m "版本 1.0.0 发布"
```

### 推送标签
```bash
git push origin v1.0.0      # 推送单个标签
git push origin --tags      # 推送所有标签
```

### 查看和删除标签
```bash
git tag                     # 查看所有标签
git show v1.0.0            # 查看标签信息

git tag -d v1.0.0          # 删除本地标签
git push origin :refs/tags/v1.0.0  # 删除远程标签
```

---

## 回退和撤销

### 撤销工作区修改
```bash
git checkout -- file.txt    # 撤销单个文件
git checkout .              # 撤销所有修改
```

### 撤销暂存区
```bash
git reset HEAD file.txt     # 取消暂存单个文件
git reset HEAD .            # 取消所有暂存
```

### 回退提交
```bash
# 保留修改内容，只撤销 commit
git reset --soft HEAD^

# 撤销 commit 和 add，保留工作区修改
git reset --mixed HEAD^
# 或者
git reset HEAD^

# 完全回退（危险！会丢失修改）
git reset --hard HEAD^
```

### 回退到指定版本
```bash
git log --oneline          # 查看提交历史
git reset --hard abc123    # 回退到指定 commit
```

### 撤销已推送的提交
```bash
# 方法 1：revert（推荐，保留历史）
git revert HEAD            # 撤销最后一次提交
git push

# 方法 2：reset + 强制推送（危险！）
git reset --hard HEAD^
git push -f origin main
```

---

## 查看历史和差异

### 查看提交历史
```bash
git log                     # 详细历史
git log --oneline          # 简洁历史
git log --graph            # 图形化分支
git log -p                 # 显示每次提交的差异
git log -3                 # 只显示最近 3 次
git log --author="name"    # 按作者筛选
```

### 查看文件差异
```bash
git diff                   # 工作区 vs 暂存区
git diff HEAD              # 工作区 vs 最新提交
git diff --cached          # 暂存区 vs 最新提交
git diff branch1 branch2   # 比较两个分支
```

### 查看文件历史
```bash
git log -- file.txt        # 文件的提交历史
git blame file.txt         # 每行代码的修改记录
```

---

## 储藏工作进度

### 使用 stash
```bash
# 储藏当前工作
git stash
git stash save "描述信息"

# 查看储藏列表
git stash list

# 恢复储藏
git stash pop              # 恢复并删除
git stash apply            # 恢复但保留
git stash apply stash@{0}  # 恢复指定储藏

# 删除储藏
git stash drop stash@{0}   # 删除指定储藏
git stash clear            # 清空所有储藏
```

**使用场景**：
- 临时切换分支处理紧急问题
- 暂存未完成的工作

---

## Git 配置

### 全局配置
```bash
# 用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 默认编辑器
git config --global core.editor vim

# 默认分支名
git config --global init.defaultBranch main

# 查看配置
git config --list
git config user.name
```

### 别名配置
```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD'
git config --global alias.last 'log -1 HEAD'
git config --global alias.lg "log --graph --oneline --all"
```

---

## SOP：标准协作开发流程

### ✅ 开始新任务
```bash
# 1. 同步主分支
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feature/task-name

# 3. 开发并提交
# ... 进行开发 ...
git add .
git commit -m "feat: 功能描述"

# 4. 推送到远程
git push origin feature/task-name
```

### ✅ 提交 Pull Request
1. 在 GitHub 创建 Pull Request
2. 填写详细的 PR 描述
3. 关联相关 Issue
4. 请求 Code Review
5. 根据反馈修改代码

### ✅ 合并后清理
```bash
# 切换回主分支
git checkout main

# 拉取最新代码
git pull origin main

# 删除本地功能分支
git branch -d feature/task-name

# 删除远程功能分支
git push origin --delete feature/task-name
```

---

## 最佳实践

### 提交频率
- ✅ 小步提交，经常提交
- ✅ 每个提交只做一件事
- ✅ 确保每次提交代码可运行

### 分支策略
- `main/master`: 生产环境代码
- `develop`: 开发环境代码
- `feature/*`: 功能开发分支
- `hotfix/*`: 紧急修复分支
- `release/*`: 发布准备分支

### 代码审查
- ✅ 所有代码通过 PR 合并
- ✅ 至少一人审核通过
- ✅ 通过自动化测试
- ✅ 解决所有评论后再合并

### 安全注意事项
- ❌ 不要提交敏感信息（密码、密钥、token）
- ❌ 不要提交大文件（使用 Git LFS）
- ✅ 使用 .gitignore 排除无关文件
- ✅ 定期更新依赖包

---

## 学习资源

- [Pro Git 中文版](https://git-scm.com/book/zh/v2)
- [GitHub 官方文档](https://docs.github.com/cn)
- [Git 常用命令速查表](https://training.github.com/downloads/zh_CN/github-git-cheat-sheet/)

## 学习记录
- 📅 2025-11-05：创建 Git & GitHub 工作流程文档
- 💡 重点：本地仓库上传流程和常见问题解决
