# Ralph - 多代理自主任务执行系统

Ralph 是一个通过迭代执行系统化实现产品需求的自主 AI 系统，采用**多代理架构**。由监督者协调专业子代理，每个子代理负责工作流程的一个方面。

---

## 架构

Ralph 使用 6 个协同工作的代理：

| 代理 | 角色 | 使用时机 |
|------|------|---------|
| **@ralph-supervisor** | 编排者 - 读取状态、选择任务、委派 | 每次迭代（默认代理） |
| **@prd-creator** | 从描述生成/修改结构化 PRD | 设置阶段 |
| **@prd-validator** | 验证 PRD 结构、规模、依赖顺序 | 循环开始前 |
| **@implementer** | 实现单个用户故事 | 每次迭代 |
| **@quality-checker** | 运行类型检查/lint/测试/构建，修复失败 | 每次实现后 |
| **@progress-tracker** | 更新 prd.json、progress.txt，提交更改 | 质量检查通过后 |

### 流程

```
用户请求
    |
    v
@ralph-supervisor（读取状态，决定下一步）
    |
    +---> 无 PRD？---> @prd-creator ---> @prd-validator
    |
    +---> PRD 存在？---> 选择下一个故事
              |
              v
         @implementer（实现一个故事）
              |
              v
         @quality-checker（运行检查，修复失败）
              |
              v
         @progress-tracker（更新状态，提交）
              |
              v
         @ralph-supervisor（检查：全部完成？还是继续？）
              |
              +---> 故事剩余: <promise>CONTINUE</promise>
              +---> 全部完成: <promise>COMPLETE</promise>
```

---

## 核心原则

1. **监督者从不实现** - 仅读取状态、做决策、委派
2. **每次迭代一个故事** - 每个循环周期处理一个用户故事
3. **全新上下文，持久记忆** - 通过 `prd.json`、`progress.txt` 和 git 历史持久化
4. **质量检查是强制性的** - @quality-checker 必须通过才能运行 @progress-tracker
5. **委派时提供完整上下文** - 子代理从零开始；监督者必须提供所有需要的信息

---

## 完成信号

系统监控 @ralph-supervisor 的这些信号：

- `<promise>COMPLETE</promise>` - 所有故事通过，循环结束
- `<promise>CONTINUE</promise>` - 故事剩余，开始新迭代

---

## 错误处理

| 错误 | 处理者 |
|------|--------|
| 质量检查失败 | @quality-checker 修复并重试（最多3次） |
| 故事被依赖阻塞 | @ralph-supervisor 跳到下一个故事 |
| PRD 验证失败 | @ralph-supervisor 重新委派给 @prd-creator |
| 达到最大迭代次数 | @ralph-supervisor 报告剩余故事 |
