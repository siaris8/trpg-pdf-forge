# 预设卡提取指南

适用：Quickstart、模组、规则书里已经填好、可直接开玩的角色。

## 1. 先分类

| kind | 含义 | 处理 |
|---|---|---|
| `pregen-pc` | 预设玩家角色 | 提取为预设卡 |
| `npc` | 模组 NPC/敌人 | 提取但标记 NPC，不混进玩家预设卡 |
| `archetype` | 原型模板 | 不当作预设卡 |
| `unknown` | 有角色数据但来源不清 | 标记待确认 |

不要把所有属性块都当预设卡；至少要有姓名，并且属性/技能/武器/资源里至少两项。

## 2. 先检测

```powershell
node .trpg/run-python.mjs .trpg/pregens.py detect --source work/source.json --out work/pregen-candidates.json --lang de
```

关键词：`Vorgefertigte Charaktere`、`Spielfertige Charaktere`、`Schnellstart-Charaktere`、`Beispielcharaktere`、`Pregenerated Characters`、`Ready-to-Play`、`预设角色`、`预设卡`。

检测到章节但 `work/pregens.json` 为空，`sheet-check` 会失败。

## 3. 写 work/pregens.json

每张卡：

```json
{
  "id": "pregen-01",
  "kind": "pregen-pc",
  "name": "钟表守卫",
  "nameOriginal": "Uhrenwächter",
  "archetype": "守卫",
  "sourcePages": [12, 13],
  "sourceSection": "Vorgefertigte Charaktere",
  "attributes": [["强横", 3], ["战术", 2]],
  "skills": [["侦查", 3]],
  "weapons": [["左轮", "2d6"]],
  "resources": [["HP", 10, 12]],
  "abilities": [["时间回响", "每场景一次"]],
  "gear": [["怀表", 1]],
  "notes": "",
  "missing": []
}
```

- 德文原名放 `nameOriginal`；中文译名放 `name`。
- 源书没有的字段写进 `missing`，不要编造。
- 预设卡和 NPC 必须用 `kind` 分开。

## 4. 生成

```powershell
node .trpg/run-python.mjs .trpg/pregens.py build --data work/pregens.json --out out/pregens.xlsx
```

- ≤8 张：一个 `out/pregens.xlsx`，含 `预设卡索引` + 每张一个 sheet。
- >8 张：`out/pregens/INDEX.xlsx` + 每张一个 xlsx。
- 基础空白车卡始终是 `out/character-sheet.xlsx`，不混入预设卡。

## 5. 检查

```powershell
node .trpg/run-python.mjs .trpg/sheet-check.py out/character-sheet.xlsx --mode all --json out/SHEET-QA.json
```

`SHEET-QA.json` 必须 `base.ok=true` 且 `pregens.ok=true`。

## 波兰语关键词

`Gotowe postacie`、`Postacie gotowe do gry`、`Postacie startowe`、`Przykładowe postacie`、`Szybki start`、`Bohaterowie`、`NSC`。
