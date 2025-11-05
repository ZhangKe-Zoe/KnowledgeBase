# Vim 和 Nano 编辑器使用教程

> Linux 命令行文本编辑器快速入门指南

---

## 📋 目录

- [编辑器对比](#编辑器对比)
- [Nano 使用教程](#nano-使用教程)
- [Vim 使用教程](#vim-使用教程)
- [实用场景示例](#实用场景示例)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)

---

## 编辑器对比

### Nano vs Vim

| 特性 | Nano | Vim |
|------|------|-----|
| **难度** | ⭐ 简单易学 | ⭐⭐⭐⭐ 学习曲线陡峭 |
| **功能** | ⭐⭐ 基础功能 | ⭐⭐⭐⭐⭐ 功能强大 |
| **速度** | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 极快 |
| **适用场景** | 快速编辑、新手 | 大型文件、专业开发 |

### 选择建议

**使用 Nano 的场景**：
- ✅ 第一次使用命令行编辑器
- ✅ 快速修改配置文件
- ✅ 简单的文本编辑
- ✅ 不想记忆复杂命令

**使用 Vim 的场景**：
- ✅ 需要高效编辑代码
- ✅ 处理大型文件
- ✅ 需要强大的搜索替换
- ✅ 想提高编辑效率

---

## Nano 使用教程

### 基础操作

#### 打开文件

```bash
# 打开已存在的文件
nano filename.txt

# 创建新文件
nano newfile.txt

# 以只读模式打开
nano -v filename.txt

# 打开文件并跳到指定行
nano +10 filename.txt
```

#### 界面说明

```
  GNU nano 4.8                    filename.txt                    Modified

这里是文件内容
可以直接输入文字
光标显示在当前位置

^G Get Help  ^O Write Out ^W Where Is  ^K Cut Text  ^J Justify
^X Exit      ^R Read File ^\ Replace   ^U Paste     ^T To Spell
```

**符号说明**：
- `^` 表示 `Ctrl` 键
- `M-` 表示 `Alt` 键（或 `Esc` 键）

### 基本编辑

#### 移动光标

```
方向键：↑ ↓ ← →

Ctrl + A：移到行首
Ctrl + E：移到行尾

Ctrl + Y：向上翻页（Page Up）
Ctrl + V：向下翻页（Page Down）

Alt + \：移到文件开头
Alt + /：移到文件末尾
```

#### 文本输入

```
直接输入：输入字符
Enter：换行
Backspace：删除前一个字符
Delete：删除当前字符
```

#### 删除文本

```
Ctrl + K：剪切当前行（删除整行）
Ctrl + U：粘贴剪切的内容
Alt + 6：复制当前行

Ctrl + K + Ctrl + K：连续剪切多行
```

### 文件操作

#### 保存文件

```bash
Ctrl + O：保存（Write Out）
# 提示输入文件名，按 Enter 确认
# 如果要另存为，输入新文件名

# 快捷流程：
# 1. 按 Ctrl + O
# 2. 显示：File Name to Write: filename.txt
# 3. 按 Enter 保存
```

#### 退出编辑器

```bash
Ctrl + X：退出

# 如果有未保存的更改：
# Save modified buffer? (Y/N)
# Y：保存并退出
# N：不保存直接退出
# Ctrl + C：取消退出
```

#### 保存并退出

```bash
# 标准流程：
Ctrl + O  # 保存
Enter     # 确认
Ctrl + X  # 退出
```

### 搜索和替换

#### 搜索文本

```bash
Ctrl + W：搜索（Where Is）
# 输入搜索词
# 按 Enter 开始搜索

Alt + W：继续搜索下一个

# 示例：
Ctrl + W
Search: error     # 输入 "error"
Enter            # 开始搜索
Alt + W          # 查找下一个 "error"
```

#### 替换文本

```bash
Ctrl + \：替换（Replace）

# 操作流程：
Ctrl + \
Search: old_text      # 输入要查找的文本
Replace with: new_text # 输入替换后的文本

# 然后会提示：
# Y：替换当前匹配
# N：跳过当前匹配
# A：替换所有匹配
# Ctrl + C：取消
```

### 进阶功能

#### 行号显示

```bash
# 启动时显示行号
nano -l filename.txt

# 或在编辑时切换
Alt + #：显示/隐藏行号
```

#### 跳转到指定行

```bash
Ctrl + _：跳转到指定行和列

# 输入行号，列号
# 例如：10,5 表示第 10 行第 5 列
```

#### 选择和操作文本

```bash
# 标记开始位置
Alt + A：开始标记（Set Mark）

# 移动光标选择文本

# 操作选中的文本
Ctrl + K：剪切选中内容
Alt + 6：复制选中内容
Ctrl + U：粘贴
```

#### 撤销和重做

```bash
Alt + U：撤销（Undo）
Alt + E：重做（Redo）

# 注意：某些版本可能不支持
```

### 常用快捷键总结

| 快捷键 | 功能 | 记忆技巧 |
|--------|------|----------|
| **Ctrl + O** | 保存文件 | **O**utput |
| **Ctrl + X** | 退出 | E**x**it |
| **Ctrl + W** | 搜索 | **W**here is |
| **Ctrl + \\** | 替换 | Replace |
| **Ctrl + K** | 剪切行 | **K**ut（剪切）|
| **Ctrl + U** | 粘贴 | **U**npaste |
| **Ctrl + A** | 行首 | Line st**A**rt |
| **Ctrl + E** | 行尾 | Line **E**nd |
| **Ctrl + G** | 帮助 | **G**et help |
| **Alt + A** | 标记 | M**a**rk |
| **Alt + U** | 撤销 | **U**ndo |

---

## Vim 使用教程

### 核心概念

Vim 有**三种模式**，这是最重要的概念：

1. **普通模式（Normal Mode）**：默认模式，用于移动和操作
2. **插入模式（Insert Mode）**：用于输入文本
3. **命令模式（Command Mode）**：用于执行命令（保存、退出等）

```
普通模式 ──i/a/o──> 插入模式
    ↑                    │
    │                    │
    └────── Esc ─────────┘
    │
    └────── : ──────> 命令模式
```

### 基础操作

#### 打开文件

```bash
# 打开文件
vim filename.txt

# 创建新文件
vim newfile.txt

# 以只读模式打开
vim -R filename.txt
# 或
view filename.txt

# 打开文件并跳到指定行
vim +10 filename.txt

# 打开并跳到第一个匹配
vim +/pattern filename.txt
```

#### 退出 Vim

**这是新手最需要知道的！**

```bash
# 在普通模式下按 : 进入命令模式，然后：

:q          # 退出（quit）
:q!         # 强制退出，不保存（quit force）
:w          # 保存（write）
:wq         # 保存并退出
:x          # 保存并退出（同 :wq）
ZZ          # 保存并退出（普通模式下直接按）
ZQ          # 不保存退出（普通模式下直接按）

# 如果卡住了，按 Esc 几次回到普通模式，然后输入 :q!
```

### 模式切换

#### 进入插入模式

```bash
# 在普通模式下按以下键：

i    # 在光标前插入（insert）
a    # 在光标后插入（append）
I    # 在行首插入
A    # 在行尾插入

o    # 在下方新建行并插入（open line below）
O    # 在上方新建行并插入（open line above）

s    # 删除当前字符并插入
S    # 删除当前行并插入
```

#### 返回普通模式

```bash
Esc    # 从插入模式返回普通模式
Ctrl + [    # 同 Esc（替代方案）
```

### 移动光标（普通模式）

#### 基本移动

```bash
h    # 左移 ←
j    # 下移 ↓
k    # 上移 ↑
l    # 右移 →

# 也可以使用方向键 ↑ ↓ ← →
```

#### 快速移动

```bash
w    # 移到下一个单词开头（word）
b    # 移到上一个单词开头（back）
e    # 移到单词结尾（end）

0    # 移到行首
^    # 移到行首第一个非空字符
$    # 移到行尾

gg   # 移到文件开头
G    # 移到文件末尾
10G  # 移到第 10 行
:10  # 移到第 10 行（命令模式）

H    # 移到屏幕顶部（High）
M    # 移到屏幕中间（Middle）
L    # 移到屏幕底部（Low）

Ctrl + f    # 向下翻页（forward）
Ctrl + b    # 向上翻页（backward）
Ctrl + d    # 向下翻半页（down）
Ctrl + u    # 向上翻半页（up）
```

### 编辑操作（普通模式）

#### 删除

```bash
x    # 删除当前字符
X    # 删除前一个字符

dw   # 删除到下一个单词（delete word）
db   # 删除到上一个单词
dd   # 删除整行
D    # 删除到行尾（同 d$）

d0   # 删除到行首
d^   # 删除到行首第一个非空字符
d$   # 删除到行尾

5dd  # 删除 5 行
```

#### 复制和粘贴

```bash
yy   # 复制当前行（yank）
Y    # 复制当前行
yw   # 复制一个单词
y$   # 复制到行尾

5yy  # 复制 5 行

p    # 在光标后粘贴（paste）
P    # 在光标前粘贴

# 示例：复制 3 行并粘贴
3yy  # 复制 3 行
p    # 粘贴
```

#### 撤销和重做

```bash
u         # 撤销（undo）
Ctrl + r  # 重做（redo）

U         # 撤销整行的所有更改
```

#### 修改

```bash
r    # 替换当前字符（replace）
R    # 进入替换模式，连续替换

c    # 修改（change）
cw   # 修改到单词结尾
cc   # 修改整行
C    # 修改到行尾

~    # 切换大小写
```

### 搜索和替换

#### 搜索

```bash
/pattern     # 向下搜索 pattern
?pattern     # 向上搜索 pattern

n            # 跳到下一个匹配（next）
N            # 跳到上一个匹配

*            # 搜索光标所在单词（向下）
#            # 搜索光标所在单词（向上）

# 示例：搜索 "error"
/error       # 输入并按 Enter
n            # 下一个
N            # 上一个
```

#### 替换

```bash
# 命令格式：:s/old/new/flags

:s/old/new/        # 替换当前行第一个
:s/old/new/g       # 替换当前行所有（global）

:%s/old/new/       # 替换所有行第一个
:%s/old/new/g      # 替换所有行所有（最常用）
:%s/old/new/gc     # 替换所有，每次确认（confirm）

:10,20s/old/new/g  # 替换 10-20 行

# 示例：将所有 "error" 替换为 "warning"
:%s/error/warning/g
```

### 可视模式

```bash
v     # 进入字符可视模式
V     # 进入行可视模式
Ctrl + v    # 进入块可视模式

# 进入可视模式后：
# 1. 移动光标选择文本
# 2. 执行操作：
#    d：删除选中内容
#    y：复制选中内容
#    c：修改选中内容
#    >：向右缩进
#    <：向左缩进

# 示例：删除多行
V        # 进入行可视模式
5j       # 向下选择 5 行
d        # 删除选中行
```

### 文件操作（命令模式）

```bash
:w              # 保存
:w filename     # 另存为
:w!             # 强制保存

:q              # 退出
:q!             # 强制退出（不保存）
:wq             # 保存并退出
:x              # 保存并退出（同 :wq）

:e filename     # 打开文件（edit）
:e!             # 重新加载当前文件（放弃所有更改）

:saveas filename    # 另存为

# 多文件操作
:bn             # 下一个文件（buffer next）
:bp             # 上一个文件（buffer previous）
:ls             # 列出所有打开的文件
```

### 进阶技巧

#### 数字组合命令

```bash
# 格式：[数字][命令]

3dd    # 删除 3 行
5yy    # 复制 5 行
10j    # 向下移动 10 行
2w     # 向前移动 2 个单词

d3w    # 删除 3 个单词
c5j    # 修改接下来的 5 行
```

#### 范围操作

```bash
# 命令格式：[起始],[结束][命令]

:1,10d          # 删除 1-10 行
:5,15y          # 复制 5-15 行
:.,+5d          # 删除当前行及下 5 行
:1,$d           # 删除所有行（$ 表示最后一行）
:%d             # 删除所有行（% 表示所有行）
```

#### 标记和跳转

```bash
ma    # 在当前位置设置标记 a
'a    # 跳转到标记 a
''    # 跳回上次位置

Ctrl + o    # 跳到上一个位置
Ctrl + i    # 跳到下一个位置
```

#### 宏录制

```bash
qa          # 开始录制宏到寄存器 a
# ... 执行一系列操作 ...
q           # 停止录制

@a          # 执行宏 a
10@a        # 执行宏 a 10 次

# 示例：批量修改格式
qa          # 开始录制
^           # 移到行首
i# <Esc>    # 插入 "# "
j           # 下移一行
q           # 停止录制
10@a        # 对接下来 10 行执行
```

#### 分屏

```bash
:split filename    # 水平分屏（:sp）
:vsplit filename   # 垂直分屏（:vs）

Ctrl + w + w      # 切换窗口
Ctrl + w + h/j/k/l # 移动到左/下/上/右窗口
Ctrl + w + q      # 关闭当前窗口

:only             # 只保留当前窗口
```

### Vim 常用快捷键总结

| 快捷键 | 功能 | 模式 |
|--------|------|------|
| **i** | 插入 | 普通 |
| **Esc** | 返回普通模式 | 任何 |
| **:wq** | 保存并退出 | 命令 |
| **:q!** | 不保存退出 | 命令 |
| **dd** | 删除行 | 普通 |
| **yy** | 复制行 | 普通 |
| **p** | 粘贴 | 普通 |
| **u** | 撤销 | 普通 |
| **Ctrl+r** | 重做 | 普通 |
| **/pattern** | 搜索 | 命令 |
| **:%s/old/new/g** | 全局替换 | 命令 |
| **gg** | 文件开头 | 普通 |
| **G** | 文件末尾 | 普通 |
| **v** | 可视模式 | 普通 |

---

## 实用场景示例

### 场景 1：编辑 .gitignore 文件

**使用 Nano**：

```bash
# 打开文件
nano .gitignore

# 添加内容（直接输入）
__pycache__/
*.pyc
*.log

# 保存并退出
Ctrl + O    # 保存
Enter       # 确认
Ctrl + X    # 退出
```

**使用 Vim**：

```bash
# 打开文件
vim .gitignore

# 按 i 进入插入模式
i

# 输入内容
__pycache__/
*.pyc
*.log

# 按 Esc 回到普通模式
Esc

# 保存并退出
:wq
Enter
```

### 场景 2：批量替换

**使用 Nano**：

```bash
nano config.txt

# 替换所有 "localhost" 为 "192.168.1.100"
Ctrl + \                 # 启动替换
Search: localhost        # 输入要查找的
Replace with: 192.168.1.100  # 输入替换后的
A                        # 全部替换
```

**使用 Vim**：

```bash
vim config.txt

# 在命令模式下
:%s/localhost/192.168.1.100/g
Enter

# 保存退出
:wq
```

### 场景 3：查看和编辑大文件

**使用 Nano**：

```bash
# 打开并显示行号
nano -l large_file.log

# 跳到指定行
Ctrl + _
100    # 跳到第 100 行
```

**使用 Vim**：

```bash
vim large_file.log

# 跳到第 100 行
:100
Enter

# 或在普通模式
100G

# 搜索关键词
/ERROR
Enter
n    # 下一个
```

### 场景 4：删除空行

**使用 Nano**：
- 需要手动逐行删除（Ctrl + K）

**使用 Vim**：

```bash
vim file.txt

# 删除所有空行
:g/^$/d
Enter

# 解释：
# :g - 全局命令
# /^$/ - 匹配空行（^ 行首，$ 行尾）
# d - 删除
```

### 场景 5：添加行号到每行

**使用 Vim**：

```bash
vim file.txt

# 方法 1：在开头添加行号
:%s/^/\=line('.') . '. '/
Enter

# 方法 2：使用外部命令
:%!nl
Enter
```

### 场景 6：格式化 JSON 文件

**使用 Vim**：

```bash
vim data.json

# 格式化 JSON（需要安装 python）
:%!python -m json.tool
Enter
```

---

## 常见问题

### Nano 常见问题

#### Q1：如何显示所有可用快捷键？

```bash
# 启动时
nano -h

# 或在编辑时
Ctrl + G    # 显示帮助
```

#### Q2：如何启用鼠标支持？

```bash
# 启动时
nano -m filename.txt

# 或在配置文件中
echo "set mouse" >> ~/.nanorc
```

#### Q3：保存时提示权限不足？

```bash
# 如果忘记用 sudo，可以：
Ctrl + O
# 输入：| sudo tee %
Enter

# 或者退出后重新用 sudo 打开
sudo nano filename
```

### Vim 常见问题

#### Q1：误按了某个键，不知道现在在什么模式？

```bash
# 疯狂按 Esc 几次，回到普通模式
Esc Esc Esc

# 然后可以：
:q!    # 不保存退出
```

#### Q2：如何让 Vim 显示行号？

```bash
# 临时显示
:set number    # 或 :set nu

# 永久显示（添加到配置文件）
echo "set number" >> ~/.vimrc
```

#### Q3：粘贴时格式错乱？

```bash
# 进入粘贴模式
:set paste

# 粘贴内容

# 退出粘贴模式
:set nopaste
```

#### Q4：如何在 Vim 中执行 shell 命令？

```bash
# 临时执行命令并查看输出
:!ls -la
Enter

# 将命令输出插入到当前位置
:r !date
Enter
```

#### Q5：意外退出，如何恢复？

```bash
# Vim 会自动创建交换文件
vim filename.txt

# 会提示：
# Found a swap file...
# 选择：
# R：恢复（Recover）
# D：删除交换文件（Delete）
```

---

## 最佳实践

### 初学者建议

**从 Nano 开始**：
```bash
# 1. 学习基本操作
nano test.txt
# 输入一些内容
# Ctrl + O, Enter, Ctrl + X

# 2. 练习搜索替换
nano test.txt
# Ctrl + W 搜索
# Ctrl + \ 替换

# 3. 熟悉后逐渐转向 Vim
```

**Vim 学习路径**：

```bash
# 第 1 天：学会退出和基本编辑
vim test.txt
i          # 输入内容
Esc        # 退出插入模式
:wq        # 保存退出

# 第 2-3 天：学习移动和删除
h j k l    # 移动
dd yy p    # 删除、复制、粘贴

# 第 4-7 天：搜索替换
/pattern
:%s/old/new/g

# 第 2 周：可视模式和进阶命令
v V        # 可视模式
数字组合   # 3dd, 5yy

# 持续练习：使用 vimtutor
vimtutor
```

### 配置优化

**Nano 配置**（~/.nanorc）：

```bash
# 创建配置文件
cat > ~/.nanorc << 'EOF'
# 显示行号
set linenumbers

# 自动缩进
set autoindent

# 启用鼠标
set mouse

# 平滑滚动
set smooth

# 语法高亮
include /usr/share/nano/*.nanorc

# 制表符宽度
set tabsize 4
EOF
```

**Vim 配置**（~/.vimrc）：

```bash
# 创建配置文件
cat > ~/.vimrc << 'EOF'
" 显示行号
set number

" 语法高亮
syntax on

" 自动缩进
set autoindent
set smartindent

" 制表符设置
set tabstop=4
set shiftwidth=4
set expandtab

" 搜索设置
set ignorecase    " 忽略大小写
set smartcase     " 智能大小写
set hlsearch      " 高亮搜索结果
set incsearch     " 增量搜索

" 显示匹配的括号
set showmatch

" 启用鼠标
set mouse=a

" 显示当前模式
set showmode

" 显示命令
set showcmd

" 文件编码
set encoding=utf-8

" 颜色方案
colorscheme desert

" 突出显示当前行
set cursorline

" 记住上次打开位置
autocmd BufReadPost *
  \ if line("'\"") > 0 && line("'\"") <= line("$") |
  \   exe "normal! g`\"" |
  \ endif
EOF
```

### 快捷速记

**Nano 速记法**：
- **保存**：Ctrl + **O**（**O**utput）
- **退出**：Ctrl + **X**（E**x**it）
- **搜索**：Ctrl + **W**（**W**here）
- **剪切**：Ctrl + **K**（**K**ut）

**Vim 速记法**：
- **i**：**i**nsert（插入）
- **a**：**a**ppend（追加）
- **d**：**d**elete（删除）
- **y**：**y**ank（复制）
- **p**：**p**aste（粘贴）
- **u**：**u**ndo（撤销）

### SOP：日常编辑标准流程

#### Nano 标准流程

```bash
# 1. 打开文件
nano filename

# 2. 编辑内容
# 直接输入或修改

# 3. 保存
Ctrl + O
Enter

# 4. 退出
Ctrl + X
```

#### Vim 标准流程

```bash
# 1. 打开文件
vim filename

# 2. 进入插入模式
i

# 3. 编辑内容
# 输入或修改

# 4. 返回普通模式
Esc

# 5. 保存并退出
:wq
Enter
```

---

## 快速参考卡片

### Nano 快速参考

```
打开：nano file.txt
保存：Ctrl + O, Enter
退出：Ctrl + X
搜索：Ctrl + W
替换：Ctrl + \
剪切：Ctrl + K
粘贴：Ctrl + U
行首：Ctrl + A
行尾：Ctrl + E
撤销：Alt + U
帮助：Ctrl + G
```

### Vim 快速参考

```
打开：vim file.txt
退出：:q!

模式切换：
  i → 插入模式
  Esc → 普通模式
  : → 命令模式

移动：h j k l, w b, gg G
编辑：dd yy p, u Ctrl+r
搜索：/pattern, n N
替换：:%s/old/new/g
保存：:w
退出：:q
保存退出：:wq 或 ZZ
```

---

## 学习资源

### Nano

- [Nano 官方文档](https://www.nano-editor.org/docs.php)
- 查看手册：`man nano`

### Vim

- [Vim 官方文档](https://www.vim.org/docs.php)
- 内置教程：`vimtutor`（强烈推荐！）
- [Vim Adventures](https://vim-adventures.com/)（游戏化学习）
- [OpenVim 互动教程](https://www.openvim.com/)
- 查看手册：`man vim`

---

## 学习记录

- 📅 2025-11-05：创建 Vim 和 Nano 使用教程
- 💡 重点：
  - Nano 适合快速编辑，简单易用
  - Vim 功能强大，学习曲线陡峭但值得投资
  - Vim 三种模式：普通、插入、命令
  - 最重要的是知道如何退出：`:q!`
- 🎯 应用场景：
  - 配置文件编辑
  - 代码编写
  - 日志查看
  - 快速修改文本
- 📝 学习建议：
  - 初学者从 Nano 开始
  - 使用 `vimtutor` 学习 Vim
  - 每天使用，形成肌肉记忆
  - 配置文件优化体验（~/.nanorc, ~/.vimrc）
  - 从基础命令开始，逐步掌握高级功能
