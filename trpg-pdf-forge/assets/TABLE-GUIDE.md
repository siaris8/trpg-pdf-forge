# 表格优先与人物卡指南

这份指南回答三个问题：什么该做成表格、人物卡怎么处理、原卡怎么保留。

## 1. 判定顺序

按顺序判断，不要一上来就排版：

1. 能自然拆成 **2 个以上字段 × 2 行以上** 的内容 → 表格。
2. 只有一行、且字段少 → 定义列表/字段条，不造空表。
3. 大段规则、朗读、叙事 → 正文/提示框，不塞进单元格。
4. 原卡是手绘、环形、可填写格、版式特殊、字段无法可靠对齐 → **抽象表 + 原图**。
5. 原卡文字无法识读 → 只抽象确定字段，其余 `[待校对]`，原图照留。

## 2. 内容映射

| 原内容 | 输出 | 推荐列 |
|---|---|---|
| 角色卡/人物卡 | `.character-sheet` + 属性表 + 武器表 + 法术表 | 姓名/职阶/等级；属性/缩写/数值 |
| 武器、护甲 | `.table.weapons` | 名称（可含类型）/伤害/射程/弹药/特性/重量 |
| 法术、能力、天赋 | `.table.spells` | 名称/环阶或消耗/施法时间/射程/成分/持续/效果 |
| 装备、道具 | `.table.gear` | 名称/类型/数量/效果/重量/价格 |
| 弹药、消耗品 | 小表 | 名称/当前/上限/恢复/备注 |
| NPC、怪物 | `.statblock` + 小表 | 生命/护甲/攻击/弱点/动机 |
| 随机表 | `.table` | d6/d20/结果 |
| 房间钥匙 | 房间卡或表 | 编号/花色/危险/现象/出口 |
| 单句规则 | 正文/`.rule` | 不表格化 |

## 3. 表格尺寸

- 2–3 列 9.5 pt；4–5 列 9 pt；6 列 8.5 pt；不低于 8.5 pt。
- 单表高度 ≤ 页面 60%；超出拆表，重复表头，标题加“（续）”。
- 宽表（6 列以上）用横排页或拆表；不能把字号压到 8.5 pt 以下。
- 单元格内容超过 3 行：移出表格，做 `.note`/正文；表格内不塞整段规则。
- 表格宽度占满栏宽；禁止压窄表格来留白。
- 表头用 `<th scope="col">`，表格有 `<caption>`。

## 4. 角色卡

### 结构化卡

用 `.character-sheet`，按四块排：

1. 身份条：姓名、职阶、等级、玩家/所属。
2. 属性表：属性、缩写、数值、修正。
3. 衍生值：生命、护甲、意志、弹药、战争骰等。
4. 武器/法术/装备：各用小表，不要把所有字段塞进一张巨表。

### 抽象 + 原卡保留

原卡满足任一情况时使用：

- 手绘角色卡、带插画的版式、可填写格、环形图、多栏侧栏；
- 字段位置无法可靠还原；
- 直接重排会丢失原卡信息或美术。

处理方式：

1. 从原卡抽取**已确认字段**，生成抽象表。
2. 把原卡复制/裁切到 `work/source-cards/`。
3. 用 `.trpg/check-card-plan.py` 复制到 `out/SOURCE-CARDS/` 并生成索引。
4. 在 PDF 附录放原卡图，图注写原页码、角色名、“原卡仅供核对，抽象表见 p.X”。
5. 在 `work/table-plan.json` 记录映射和未确认字段。

### 原卡规则

- 空白可填写卡：保持空白；抽象表只列字段，不补数据。
- 手写/模糊内容：只保留能确认的；其余 `[待校对]`。
- 整页扫描原卡：放附录；可横排；不要当正文装饰图。
- 原卡图是核对材料，不是“插图 KPI”；`image-check.py` 的普通插图规则不强制它进正文，但 `check-card-plan.py` 会要求原图存在。

## 5. `work/table-plan.json`

```json
{
  "items": [
    {
      "id": "pc-burn-card",
      "page": 15,
      "kind": "character-sheet",
      "decision": "abstract+original",
      "source": "work/source-cards/p015-burn-card.png",
      "abstract": "book/body.html#pc-burn-card",
      "columns": ["姓名", "职阶", "属性", "武器"],
      "confirmedFields": ["姓名", "属性", "武器"],
      "uncertainFields": ["手写备注"],
      "note": "原卡为手绘版式；抽象表只放可确认字段。"
    },
    {
      "id": "weapons",
      "page": 18,
      "kind": "weapon-table",
      "decision": "as-table",
      "source": "source/source.pdf p18",
      "abstract": "book/body.html#weapons",
      "columns": ["名称", "伤害", "射程", "弹药", "特性"],
      "rows": 8
    }
  ]
}
```

- `decision`: `as-table` / `abstract+original` / `prose`。
- `as-table` 至少有 2 列。
- `abstract+original` 必须有 `source`，文件必须存在。
- `source` 可以是一个裁切图，也可以是整页渲染图。
- `note` 写为什么这样处理；不要写“无法处理”就结束。

## 6. 检查命令

```powershell
node .trpg/run-python.mjs .trpg/check-card-plan.py work/table-plan.json --out out/TABLE-PLAN.json
```

检查通过后：

- `out/TABLE-PLAN.json` 的 `ok` 必须为 true；
- `out/SOURCE-CARDS/` 中应有原卡图；
- `out/SOURCE-CARDS/INDEX.md` 列出页码、原图、抽象表位置。

## 7. 报告里必须写

- 人物卡/武器/法术/装备各做了几张表。
- 哪些原卡做了 `abstract+original`，原图在哪里。
- 哪些字段无法确认，标了什么。
- 哪些表拆过、横排过，为什么。
- 是否出现“为了表格化而丢原图”。
