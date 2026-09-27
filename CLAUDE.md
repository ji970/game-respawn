# CLAUDE.md

## reverse-skill — 逆向/安全技能路由包

当任务涉及逆向工程、APK 分析、二进制分析、JS 逆向、渗透测试、CTF、安全研究时，自动加载并执行：

- **安装路径**: `D:/reverse-skill`
- **规则入口**: `D:/reverse-skill/RULES.md`
- **快速路由**: `D:/reverse-skill/skills/MASTER-ROUTING.md`
- **工具索引**: `D:/reverse-skill/skills/tool-index.md`

路由顺序:
1. 读取 `RULES.md` → 执行行为链
2. `skills/MASTER-ROUTING.md` 匹配任务路由
3. 初始化 case scope（`skills/ops/scope-contract.md`）
4. 打开 PRIMARY `SKILL.md` 执行 ACTION REQUIRED
5. 按 Evidence→Finding→Path 流程输出

触发关键词: APK、反编译、jadx、Frida、二进制分析、JS 逆向、CTF、渗透测试、漏洞利用 等（完整列表见 RULES.md）
