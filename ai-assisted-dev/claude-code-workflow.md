# Claude Code 工作流程

> 基于 Claude Code AI 助手的开发工作流程和最佳实践

---

## 📋 目录

- [概述](#概述)
- [环境设置](#环境设置)
- [Git 分支规范](#git-分支规范)
- [开发工作流](#开发工作流)
- [任务管理](#任务管理)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)

---

## 概述

Claude Code 是 Anthropic 官方提供的 AI 辅助开发工具，可以通过 CLI 界面帮助开发者完成代码编写、调试、文档整理等任务。

### 核心特性

- ✅ 智能代码生成和编辑
- ✅ 自动化 Git 操作
- ✅ GitHub Issues/PR 处理
- ✅ 知识库管理
- ✅ 任务跟踪和规划
- ✅ 多工具并行调用

---

## 环境设置

### 检查当前环境

Claude Code 会自动识别工作环境信息：

```bash
# 自动识别的环境变量
- Working directory: 当前工作目录
- Is directory a git repo: 是否为 Git 仓库
- Platform: 操作系统平台
- OS Version: 操作系统版本
- Today's date: 当前日期
```

### Git 配置验证

```bash
# 检查 Git 配置
git config --list

# 检查远程仓库
git remote -v

# 检查当前分支
git branch
```

---

## Git 分支规范

### Claude Code 专用分支命名

**重要规则**：
- ✅ 分支必须以 `claude/` 开头
- ✅ 分支必须以匹配的 session id 结尾
- ❌ 否则推送会失败（403 HTTP 错误）

**示例**：
```bash
# 正确的分支命名
claude/knowledge-base-summary-011CUpQANvvnExky5BEQqEZg
claude/feature-implementation-abc123def456
claude/bug-fix-xyz789

# 错误的分支命名（会导致推送失败）
feature/new-feature
main
develop
```

### 分支操作

```bash
# 创建 Claude 分支
git checkout -b claude/task-name-sessionid

# 查看当前分支
git branch

# 切换分支
git checkout branch-name
```

---

## 开发工作流

### 标准开发流程

#### 1. 接收任务

```bash
# Claude Code 会自动识别：
- 任务描述
- 指定的开发分支
- Git 仓库状态
```

#### 2. 创建/切换到工作分支

```bash
# 如果分支不存在，创建新分支
git checkout -b claude/task-name-sessionid

# 如果分支已存在，切换到该分支
git checkout claude/task-name-sessionid
```

#### 3. 进行开发

- 使用 Claude Code 工具进行文件读取、编辑、创建
- 并行执行多个独立操作以提高效率
- 使用 TodoWrite 工具跟踪任务进度

#### 4. 提交更改

```bash
# 查看状态
git status

# 添加文件
git add .

# 提交（使用 HEREDOC 确保格式正确）
git commit -m "$(cat <<'EOF'
feat: 添加新功能

详细描述功能内容
EOF
)"
```

#### 5. 推送到远程

**关键：使用重试机制处理网络错误**

```bash
# 首次推送（设置上游分支）
git push -u origin claude/task-name-sessionid

# 后续推送
git push
```

**网络重试策略**：
- 仅在网络错误时重试（不是所有错误）
- 最多重试 4 次
- 指数退避：2s → 4s → 8s → 16s

```bash
# 重试逻辑示例（bash 脚本）
retry_count=0
max_retries=4
backoff_times=(2 4 8 16)

while [ $retry_count -le $max_retries ]; do
  git push -u origin branch-name

  if [ $? -eq 0 ]; then
    echo "Push successful"
    break
  fi

  if [ $retry_count -lt $max_retries ]; then
    sleep_time=${backoff_times[$retry_count]}
    echo "Push failed, retrying in ${sleep_time}s..."
    sleep $sleep_time
    retry_count=$((retry_count + 1))
  else
    echo "Push failed after $max_retries retries"
    exit 1
  fi
done
```

---

## 任务管理

### 使用 TodoWrite 工具

Claude Code 提供了任务管理工具来跟踪进度：

**任务状态**：
- `pending`: 待处理
- `in_progress`: 进行中（同时只能有一个）
- `completed`: 已完成

**使用场景**：
- ✅ 复杂的多步骤任务（3+ 步骤）
- ✅ 用户提供多个任务
- ✅ 需要跟踪进度的任务
- ❌ 简单的单步任务
- ❌ 纯信息查询

**示例**：

```json
[
  {
    "content": "创建知识库文档",
    "status": "in_progress",
    "activeForm": "创建知识库文档"
  },
  {
    "content": "提交并推送更改",
    "status": "pending",
    "activeForm": "提交并推送更改"
  }
]
```

### 任务管理最佳实践

1. **立即标记完成**：完成任务后立即标记为 completed
2. **一次一个**：同时只有一个任务为 in_progress
3. **描述清晰**：使用清晰的任务描述
4. **双重形式**：
   - `content`: 命令式（"创建文档"）
   - `activeForm`: 进行时（"创建文档"）

---

## 常见问题

### 问题 1：推送失败 403 错误

**原因**：分支名称不符合规范

**解决**：
```bash
# 确保分支名以 claude/ 开头
git checkout -b claude/correct-branch-name-sessionid

# 如果已经在错误的分支上
git branch -m claude/correct-branch-name-sessionid
```

### 问题 2：网络推送失败

**原因**：网络不稳定

**解决**：
- Claude Code 会自动重试（最多 4 次）
- 使用指数退避策略
- 仅在网络错误时重试

### 问题 3：工具使用限制

**原因**：某些操作被 hook 阻止

**解决**：
- 检查用户的 hooks 配置
- 根据 hook 反馈调整操作
- 询问用户是否需要修改 hook 设置

---

## 最佳实践

### 1. 工具使用策略

**并行执行**：
```bash
# ✅ 正确：并行读取多个文件
Read file1.md, Read file2.md, Read file3.md (in parallel)

# ❌ 错误：串行读取
Read file1.md → wait → Read file2.md → wait → Read file3.md
```

**使用专用工具**：
```bash
# ✅ 使用 Read 工具读取文件
Read file.txt

# ❌ 使用 Bash 命令
cat file.txt

# ✅ 使用 Edit 工具编辑文件
Edit file.txt

# ❌ 使用 sed
sed -i 's/old/new/' file.txt
```

### 2. Git 提交规范

**语义化提交信息**：
```bash
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
refactor: 重构代码
test: 添加测试
chore: 构建/工具更新
```

**使用 HEREDOC**：
```bash
git commit -m "$(cat <<'EOF'
feat: 添加知识库管理功能

- 创建知识库目录结构
- 添加 SOP 文档
- 更新工作流程
EOF
)"
```

### 3. 任务规划

**创建待办清单**：
- 在开始复杂任务前使用 TodoWrite
- 明确任务优先级
- 跟踪进度

**及时更新状态**：
- 开始任务时标记为 in_progress
- 完成后立即标记为 completed
- 移除不再需要的任务

### 4. 知识库管理

**文档组织**：
```
KnowledgeBase/
├── git-github/          # Git 和 GitHub 相关
├── ai-assisted-dev/     # AI 辅助开发
├── knowledge-management/ # 知识管理
└── domain-specific/     # 领域特定知识
```

**文档格式**：
- 使用 Markdown 格式
- 包含清晰的目录结构
- 提供实际操作示例
- 记录学习时间和要点
- 添加 SOP 和检查清单

### 5. 沟通风格

**简洁清晰**：
- ✅ 输出简洁的文本
- ❌ 不使用 emoji（除非用户要求）
- ✅ 使用 Markdown 格式化
- ❌ 不在代码注释中沟通

**技术准确**：
- 优先技术准确性而非盲目认同
- 提供客观的技术建议
- 必要时提出不同意见

---

## Git 操作规范

### 安全协议

**禁止操作**：
- ❌ 不要更新 git config（除非用户明确要求）
- ❌ 不要执行破坏性命令（如 push --force）
- ❌ 不要跳过 hooks（如 --no-verify）
- ❌ 不要强制推送到 main/master

**推荐操作**：
- ✅ 使用 git commit（标准提交）
- ✅ 使用 git push -u origin branch（设置上游）
- ✅ 检查 git status（提交前后）
- ✅ 使用 git log（了解提交历史）

### 提交流程

```bash
# 1. 查看状态
git status

# 2. 查看差异
git diff

# 3. 查看提交历史（了解提交风格）
git log --oneline -10

# 4. 添加文件
git add <files>

# 5. 提交
git commit -m "$(cat <<'EOF'
类型: 简短描述

详细说明（如果需要）
EOF
)"

# 6. 推送
git push -u origin branch-name

# 7. 验证
git status
```

### Pre-commit Hook 处理

如果提交因 pre-commit hook 失败：

```bash
# 1. 检查作者信息
git log -1 --format='%an %ae'

# 2. 检查是否已推送
git status  # 查看 "Your branch is ahead"

# 3. 如果都正确，可以 amend
git add .
git commit --amend --no-edit

# 4. 否则创建新提交
git add .
git commit -m "chore: 应用 pre-commit hook 更改"
```

---

## 创建 Pull Request

### PR 流程

**步骤 1：了解当前状态**

```bash
# 并行执行这些命令
git status
git diff
git log --oneline
git diff main...HEAD  # 查看与主分支的差异
```

**步骤 2：分析所有变更**

- 查看所有相关提交（不只是最新的）
- 理解完整的变更历史
- 准备 PR 摘要

**步骤 3：创建 PR**

```bash
# 使用 gh CLI（如果可用）
gh pr create --title "PR 标题" --body "$(cat <<'EOF'
## Summary
- 变更点 1
- 变更点 2
- 变更点 3

## Test plan
- [ ] 测试项 1
- [ ] 测试项 2
EOF
)"
```

**重要**：
- 不要使用 TodoWrite 工具
- 不要使用 Task 工具
- 返回 PR URL

---

## 学习资源

### 官方文档

- [Claude Code 文档](https://docs.claude.com/en/docs/claude-code/)
- [Claude Code GitHub](https://github.com/anthropics/claude-code)

### 相关链接

- [Claude Code 文档地图](https://docs.claude.com/en/docs/claude-code/claude_code_docs_map.md)
- [反馈和问题报告](https://github.com/anthropics/claude-code/issues)

### 获取帮助

```bash
# 使用 /help 命令
/help

# 查看可用工具
/tools

# 查看环境信息
/env
```

---

## 学习记录

- 📅 2025-11-05：创建 Claude Code 工作流程文档
- 💡 重点：分支命名规范、网络重试机制、任务管理
- 🎯 应用场景：AI 辅助开发、自动化 Git 操作、知识库管理
- 📝 关键经验：
  - 分支必须以 `claude/` 开头并包含 session id
  - 推送失败时使用指数退避重试
  - 并行执行独立的工具调用
  - 使用 TodoWrite 跟踪复杂任务
  - 优先使用专用工具而非 Bash 命令
