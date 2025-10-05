# MindMapGenerator Integration Guide

## Overview

The `MindMapGenerator` component has been successfully integrated with the Cosmic Canvas research platform. It now automatically generates professional mind maps from research data using a radial tree layout algorithm.

## What Changed

### 1. **Canvas Generator (`src/lib/canvas-generator.ts`)**

#### Added Import
```typescript
import type { MindMapNode } from '../components/MindMapGenerator'
```

#### Enhanced CanvasResult Interface
```typescript
export interface CanvasResult {
  // ... existing fields
  mindMapData?: MindMapNode // NEW: Mind map data structure
}
```

#### New Conversion Method
```typescript
private convertToMindMapFormat(
  researchQuestion: string,
  themes: Theme[],
  findingsMap: Map<string, KeyFinding[]>
): MindMapNode
```

This method converts research results into the hierarchical `MindMapNode` format:
- **Level 0**: Research question (center node)
- **Level 1**: Themes (main topics)
- **Level 2**: Key findings (top 8 per theme, sorted by importance)

The conversion happens automatically during canvas generation and the `mindMapData` field is populated in the `CanvasResult`.

---

### 2. **Research Canvas Component (`src/components/ResearchCanvas.tsx`)**

#### Enhanced Props
```typescript
interface ResearchCanvasProps {
  canvasData: CanvasResult
  onShapeClick?: (shapeId: string, props: any) => void
  useMindMap?: boolean // NEW: Toggle between legacy and mind map rendering
}
```

#### Dual Rendering Mode

The component now supports two rendering modes:

**Mind Map Mode (Default, `useMindMap=true`):**
- Uses the new `MindMapGenerator` component
- Renders using radial tree layout
- Professional hierarchical visualization
- Curved organic connectors

**Legacy Mode (`useMindMap=false`):**
- Uses the old shape-based rendering
- Document cards, frames, and manual layouts
- Backward compatible with existing code

#### Implementation
```tsx
export function ResearchCanvas({ canvasData, useMindMap = true }: ResearchCanvasProps) {
  return (
    <div className="w-full h-screen">
      <Tldraw>
        <CanvasLoader canvasData={canvasData} useMindMap={useMindMap} />
        {/* Render MindMapGenerator if enabled and data available */}
        {useMindMap && canvasData.mindMapData && (
          <MindMapGenerator data={canvasData.mindMapData} />
        )}
      </Tldraw>
    </div>
  )
}
```

---

## How to Use

### Automatic Usage (Default)

The mind map is generated **automatically** when you use the research canvas:

```typescript
// In your research route or component
import { ResearchCanvas } from '@/components/ResearchCanvas'

// After generating canvas data from research assistant
const canvasData = await researchAssistant.generateCanvas(...)

// Render with mind map (default behavior)
<ResearchCanvas canvasData={canvasData} />
```

**That's it!** The mind map will be generated automatically from the research data.

---

### Toggle Between Modes

You can switch between mind map and legacy rendering:

```tsx
// Use mind map (default)
<ResearchCanvas canvasData={canvasData} useMindMap={true} />

// Use legacy shapes
<ResearchCanvas canvasData={canvasData} useMindMap={false} />
```

---

### Manual Mind Map Creation

If you want to create a mind map from custom data:

```tsx
import { Tldraw } from 'tldraw'
import { MindMapGenerator, type MindMapNode } from '@/components/MindMapGenerator'

const customData: MindMapNode = {
  id: 'root',
  text: 'My Research Question',
  level: 0,
  children: [
    {
      id: 'theme-1',
      text: 'Theme 1',
      level: 1,
      children: [
        { id: 'f1', text: 'Finding 1', level: 2, children: [] },
        { id: 'f2', text: 'Finding 2', level: 2, children: [] },
      ],
    },
  ],
}

function MyComponent() {
  return (
    <Tldraw>
      <MindMapGenerator data={customData} />
    </Tldraw>
  )
}
```

---

## Data Flow

```
┌─────────────────────┐
│ Research Assistant  │
│ (User query)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Document Indexer    │
│ (Vector search)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Canvas Generator    │
│ - Theme detection   │
│ - Finding extraction│
│ - Build hierarchy   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐      ┌──────────────────────┐
│ CanvasResult        │      │ MindMapNode          │
│ {                   │──────│ {                    │
│   shapes: [...],    │      │   id: 'root',        │
│   themes: [...],    │      │   text: 'Question',  │
│   findings: {...},  │      │   level: 0,          │
│   mindMapData: {...}│◄─────│   children: [...]    │
│ }                   │      │ }                    │
└──────────┬──────────┘      └──────────────────────┘
           │
           ▼
┌─────────────────────┐
│ ResearchCanvas      │
│ (React Component)   │
└──────────┬──────────┘
           │
           ├─────────── useMindMap=true ────────┐
           │                                     │
           ▼                                     ▼
┌─────────────────────┐              ┌─────────────────────┐
│ CanvasLoader        │              │ MindMapGenerator    │
│ (Legacy shapes)     │              │ (Radial tree)       │
└─────────────────────┘              └─────────────────────┘
```

---

## API Reference

### `CanvasResult.mindMapData`

**Type:** `MindMapNode | undefined`

**Description:** Hierarchical mind map data structure automatically generated from research results.

**Structure:**
```typescript
interface MindMapNode {
  id: string          // Unique node identifier
  text: string        // Display text
  level: number       // 0 = center, 1 = themes, 2 = findings
  children: MindMapNode[]  // Child nodes
}
```

**Example:**
```typescript
{
  id: 'root',
  text: 'Effects of Spaceflight on Cellular Function',
  level: 0,
  children: [
    {
      id: 'theme-0',
      text: 'Oxidative Stress',
      level: 1,
      children: [
        {
          id: 'finding-0-0',
          text: 'Increased ROS production in microgravity',
          level: 2,
          children: []
        },
        // ... more findings (max 8 per theme)
      ]
    },
    // ... more themes
  ]
}
```

---

### `ResearchCanvas` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `canvasData` | `CanvasResult` | Required | Research canvas data from canvas generator |
| `onShapeClick` | `(shapeId: string, props: any) => void` | Optional | Click handler (legacy mode only) |
| `useMindMap` | `boolean` | `true` | Enable mind map rendering vs legacy shapes |

---

## Visual Design

The mind map follows a strict visual hierarchy:

### Level 0 (Central Topic)
- **Shape:** Large ellipse (400×150px)
- **Color:** Solid blue fill
- **Font:** Serif, extra-large (xl)
- **Text:** White

### Level 1 (Themes)
- **Shape:** Rounded rectangles (dynamic width, 80px height)
- **Colors:** Rotating palette (light-green, light-blue, light-red, light-violet, orange, yellow)
- **Font:** Sans-serif bold, large (l)
- **Text:** Black

### Level 2 (Findings)
- **Shape:** Text only (no container)
- **Font:** Sans-serif normal, medium (m)
- **Text:** Dark gray
- **Alignment:** Start-aligned

### Connectors
- **Style:** Curved organic lines
- **Color:** Medium gray
- **Arrowhead:** Arrow at end (pointing to child)
- **Bend:** Calculated from angular separation

---

## Configuration

### Limit Findings Per Theme

By default, the converter shows the top 8 findings per theme (sorted by importance). To change this:

**Edit `src/lib/canvas-generator.ts`:**

```typescript
private convertToMindMapFormat(...): MindMapNode {
  // ...
  const topFindings = findings
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 8)  // ← Change this number
  // ...
}
```

### Adjust Layout Spacing

**Edit `src/components/MindMapGenerator.tsx`:**

```typescript
const LAYOUT_CONFIG = {
  RADIUS_STEP: 350,      // Distance between levels
  MIN_RADIUS: 280,       // Starting radius for level 1
  // ... other settings
}
```

### Change Theme Colors

**Edit `src/components/MindMapGenerator.tsx`:**

```typescript
const THEME_COLORS = [
  'light-green',
  'light-blue',
  'light-red',
  'light-violet',
  'orange',
  'yellow',
  // Add more colors here
] as const
```

---

## Testing

### Test with Demo Page

Visit the demo page to see the mind map in action:

```bash
npm run dev
# Navigate to: http://localhost:3000/mind-map-demo
```

### Test with Real Research

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Ensure Chroma database is running:
   ```bash
   npm run chroma:status
   ```

3. Navigate to the research page and enter a query

4. Click "Generate Canvas" to see the mind map

### Toggle Between Modes

To test both rendering modes, modify the research page:

```tsx
// In src/routes/research.tsx or wherever ResearchCanvas is used

// Mind map mode (default)
<ResearchCanvas canvasData={canvasData} useMindMap={true} />

// Legacy mode
<ResearchCanvas canvasData={canvasData} useMindMap={false} />
```

---

## Troubleshooting

### Issue: Mind map not appearing

**Check:**
1. Is `canvasData.mindMapData` populated?
   ```typescript
   console.log('Mind map data:', canvasData.mindMapData)
   ```
2. Is `useMindMap` prop set to `true`?
3. Are there themes and findings in the research results?

**Solution:** Ensure the research query returns documents with themes and findings.

---

### Issue: Nodes overlapping

**Solution:** Adjust collision settings in `MindMapGenerator.tsx`:

```typescript
const LAYOUT_CONFIG = {
  MIN_ANGULAR_SEPARATION: 0.2,  // Increase from 0.15
  COLLISION_PADDING: 60,         // Increase from 40
}
```

---

### Issue: Canvas is blank

**Check:**
1. Open browser console for errors
2. Verify tldraw editor is mounted
3. Check that `MindMapGenerator` component is rendering

**Debug:**
```tsx
<Tldraw
  onMount={() => {
    console.log('✓ TLDraw mounted')
  }}
>
  {useMindMap && canvasData.mindMapData && (
    <>
      {console.log('✓ Rendering MindMapGenerator')}
      <MindMapGenerator data={canvasData.mindMapData} />
    </>
  )}
</Tldraw>
```

---

### Issue: Legacy mode not working

**Solution:** Set `useMindMap={false}` explicitly:

```tsx
<ResearchCanvas 
  canvasData={canvasData} 
  useMindMap={false}  // Force legacy mode
/>
```

---

## Performance

### Metrics

- **Time Complexity:** O(n) where n = total nodes
- **Space Complexity:** O(n)
- **Rendering:** Single atomic operation
- **Recommended Max:** 50 themes, 400 findings

### Optimization Tips

1. **Limit findings per theme** (default: 8)
2. **Reduce theme count** if layout becomes crowded
3. **Use importance scoring** to show only top findings
4. **Enable verbose logging** to identify bottlenecks:

```typescript
const canvas = await canvasGenerator.generateCanvas(
  documents,
  adversarialDocuments,
  { verbose: true },  // Enable timing logs
  query
)
```

---

## Future Enhancements

Potential improvements:

- [ ] **Interactive expansion:** Click to expand/collapse sub-themes
- [ ] **Filtering:** Show/hide specific themes
- [ ] **Search highlighting:** Highlight nodes matching search query
- [ ] **Export:** PNG/SVG export functionality
- [ ] **Animations:** Smooth transitions when data updates
- [ ] **Deeper hierarchies:** Support for level 3+ (sub-findings)
- [ ] **Custom styling:** User-configurable color schemes
- [ ] **Zoom controls:** Buttons for zoom in/out/fit

---

## Migration Guide

### From Legacy Canvas to Mind Map

If you're currently using the legacy canvas mode, migration is automatic:

**Before:**
```tsx
<ResearchCanvas canvasData={canvasData} />
```

**After (automatic):**
```tsx
<ResearchCanvas canvasData={canvasData} />  // Now uses mind map by default!
```

To keep legacy mode:
```tsx
<ResearchCanvas canvasData={canvasData} useMindMap={false} />
```

### Custom Canvas Implementations

If you have custom canvas implementations, you can use the `MindMapGenerator` directly:

```tsx
import { MindMapGenerator } from '@/components/MindMapGenerator'
import type { CanvasResult } from '@/lib/canvas-generator'

function CustomCanvas({ canvasData }: { canvasData: CanvasResult }) {
  return (
    <Tldraw>
      {canvasData.mindMapData && (
        <MindMapGenerator data={canvasData.mindMapData} />
      )}
    </Tldraw>
  )
}
```

---

## Summary

✅ **Automatic Integration** - Mind maps are generated automatically from research results  
✅ **No Breaking Changes** - Legacy mode still available via `useMindMap={false}`  
✅ **Professional Design** - Follows strict visual hierarchy specifications  
✅ **Radial Layout** - Smart positioning with collision avoidance  
✅ **Configurable** - Easy to adjust colors, spacing, and limits  
✅ **Type-Safe** - Full TypeScript support  
✅ **Production-Ready** - Tested and documented  

The MindMapGenerator is now fully integrated with Cosmic Canvas! 🎉

---

**For questions or issues, refer to:**
- `MIND_MAP_GENERATOR_README.md` - Component documentation
- `src/components/MindMapGenerator.tsx` - Component source code
- `src/lib/canvas-generator.ts` - Canvas generation logic
- `src/routes/mind-map-demo.tsx` - Live demo example
