#!/bin/bash
# ================================================================
# IHR-NEXUS 项目重构迁移脚本
# 用途：自动创建新目录结构并移动文件到对应位置
# 使用：cd 到项目根目录后执行 bash restructure.sh
# ================================================================

set -e  # 遇到错误立即停止

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  IHR-NEXUS 项目重构迁移脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 确认当前在项目根目录
if [ ! -f "package.json" ] || [ ! -f "App.tsx" ]; then
    echo -e "${RED}错误：请确保在 IHR-NEXUS 项目根目录下运行此脚本！${NC}"
    exit 1
fi

echo -e "${YELLOW}即将对项目进行重构，文件将被移动到新的目录结构中。${NC}"
echo -e "${YELLOW}请确保已提交当前所有代码到 git！${NC}"
echo ""
read -p "确认继续？(y/n) " confirm
if [ "$confirm" != "y" ]; then
    echo "已取消。"
    exit 0
fi

echo ""
echo -e "${GREEN}[1/5] 创建新目录结构...${NC}"

# client 目录
mkdir -p client/components
mkdir -p client/views
mkdir -p client/contexts

# server 目录
mkdir -p server/services
mkdir -p server/api
mkdir -p server/auth
mkdir -p server/database

# shared 目录
mkdir -p shared

# docs 目录
mkdir -p docs/flows
mkdir -p docs/guides
mkdir -p docs/requirements

# archived 目录
mkdir -p _archived

echo "  ✅ 目录创建完成"

# ================================================================
echo ""
echo -e "${GREEN}[2/5] 移动前端文件到 client/ ...${NC}"

# 根目录核心前端文件
mv App.tsx client/App.tsx
echo "  → App.tsx → client/App.tsx"

mv index.tsx client/index.tsx
echo "  → index.tsx → client/index.tsx"

mv index.html client/index.html
echo "  → index.html → client/index.html"

mv index.css client/index.css
echo "  → index.css → client/index.css"

# components → client/components (排除 views/ 和 AuthContext)
mv components/CanvasArea.tsx client/components/CanvasArea.tsx
echo "  → components/CanvasArea.tsx → client/components/"

mv components/EileenSidebar.tsx client/components/EileenSidebar.tsx
echo "  → components/EileenSidebar.tsx → client/components/"

mv components/RedPenCard.tsx client/components/RedPenCard.tsx
echo "  → components/RedPenCard.tsx → client/components/"

# AuthContext → client/contexts/
mv components/AuthContext.tsx client/contexts/AuthContext.tsx
echo "  → components/AuthContext.tsx → client/contexts/"

# views 提升一级 → client/views/
mv components/views/WelcomeView.tsx client/views/WelcomeView.tsx
mv components/views/DashboardView.tsx client/views/DashboardView.tsx
mv components/views/OrderDetailView.tsx client/views/OrderDetailView.tsx
mv components/views/OrderTrackingView.tsx client/views/OrderTrackingView.tsx
mv components/views/ReportView.tsx client/views/ReportView.tsx
mv components/views/InitiationView.tsx client/views/InitiationView.tsx
mv components/views/CandidateMobileView.tsx client/views/CandidateMobileView.tsx
echo "  → components/views/*.tsx → client/views/"

echo "  ✅ 前端文件移动完成"

# ================================================================
echo ""
echo -e "${GREEN}[3/5] 移动后端和共享文件...${NC}"

# 后端服务
mv utils/geminiApi.ts server/services/geminiService.ts
echo "  → utils/geminiApi.ts → server/services/geminiService.ts"

# 共享类型
mv types.ts shared/types.ts
echo "  → types.ts → shared/types.ts"

echo "  ✅ 后端和共享文件移动完成"

# ================================================================
echo ""
echo -e "${GREEN}[4/5] 整理文档...${NC}"

# flows 流程文档 (从 docs/ 移动到 docs/flows/)
if [ -f "docs/interview_invitation_flow.md" ]; then
    mv docs/interview_invitation_flow.md docs/flows/
    echo "  → docs/interview_invitation_flow.md → docs/flows/"
fi
if [ -f "docs/ksq_interaction_flow.md" ]; then
    mv docs/ksq_interaction_flow.md docs/flows/
    echo "  → docs/ksq_interaction_flow.md → docs/flows/"
fi
if [ -f "docs/screening_focus_v1.md" ]; then
    mv docs/screening_focus_v1.md docs/flows/
    echo "  → docs/screening_focus_v1.md → docs/flows/"
fi

# guides 指南文档
if [ -f "docs/typography-guide.md" ]; then
    mv docs/typography-guide.md docs/guides/
    echo "  → docs/typography-guide.md → docs/guides/"
fi
if [ -f "docs/extension_peripheral_features.md" ]; then
    mv docs/extension_peripheral_features.md docs/guides/
    echo "  → docs/extension_peripheral_features.md → docs/guides/"
fi
if [ -f "GEMINI_SETUP.md" ]; then
    mv GEMINI_SETUP.md docs/guides/
    echo "  → GEMINI_SETUP.md → docs/guides/"
fi

# requirements 需求文档 (从 context/ 移动)
if [ -d "context" ]; then
    # 移动所有 context 内容到 docs/requirements
    for f in context/*; do
        fname=$(basename "$f")
        # 跳过 .DS_Store
        if [ "$fname" = ".DS_Store" ]; then
            continue
        fi
        mv "$f" "docs/requirements/"
        echo "  → context/$fname → docs/requirements/"
    done
    # 删除空的 context 目录
    rmdir context 2>/dev/null || rm -rf context/.DS_Store && rmdir context 2>/dev/null
    echo "  → 已清理空的 context/ 目录"
fi

echo "  ✅ 文档整理完成"

# ================================================================
echo ""
echo -e "${GREEN}[5/5] 归档废弃文件...${NC}"

# 归档旧版项目副本
if [ -d "ai-recruiting-agent" ]; then
    mv ai-recruiting-agent _archived/
    echo "  → ai-recruiting-agent/ → _archived/"
fi

# 归档 components/App.tsx (重复文件)
if [ -f "components/App.tsx" ]; then
    mv components/App.tsx _archived/App.tsx.bak
    echo "  → components/App.tsx → _archived/App.tsx.bak"
fi

# 归档废弃的 dev-server
if [ -f "dev-server.js" ]; then
    mv dev-server.js _archived/
    echo "  → dev-server.js → _archived/"
fi

# 清理空目录
rmdir components/views 2>/dev/null && echo "  → 清理空目录 components/views/" || true
rmdir components 2>/dev/null && echo "  → 清理空目录 components/" || true
rmdir utils 2>/dev/null && echo "  → 清理空目录 utils/" || true

echo "  ✅ 归档完成"

# ================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  ✅ 文件迁移完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "新目录结构："
echo "  client/       ← 前端 UI (App, 组件, 页面, 样式)"
echo "  server/       ← 后端服务 (AI, API, 认证)"
echo "  shared/       ← 共享类型定义"
echo "  docs/         ← 文档与需求"
echo "  _archived/    ← 已归档的废弃文件"
echo ""
echo -e "${YELLOW}⚠️  下一步：需要修复代码中的 import 路径！${NC}"
echo -e "${YELLOW}   请在对话中告诉我『继续修复 import 路径』${NC}"
echo ""
