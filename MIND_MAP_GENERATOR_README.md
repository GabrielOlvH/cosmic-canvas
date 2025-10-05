# MindMapGenerator Component

## Overview

The `MindMapGenerator` is a sophisticated React component that programmatically generates visually appealing and well-structured mind maps on a tldraw canvas. It uses a **radial tree layout algorithm** to create hierarchical visualizations of academic research data or any structured information.

## Features

✨ **Hierarchical Visual Design**
- Central topic: Large blue ellipse with serif font
- Main themes: Colorful rounded rectangles with sans-serif bold text
- Sub-topics: Clean text-only nodes

🎨 **Professional Styling**
- Solid fills with carefully chosen color palettes
- Font hierarchy (serif XL → sans-serif L → sans-serif M)
- Curved organic arrows with proper arrowheads

📐 **Smart Layout Algorithm**
- Radial tree positioning with polar coordinates
- Collision avoidance based on node widths
- Dynamic angular distribution
- Automatic spacing and centering

🔗 **Proper Connections**
- Binding-based arrow connections
- Maintains connections when nodes are manually moved
- Curved connectors for organic appearance

⚡ **Atomic Operations**
- Entire mind map generates in a single undo action
- Clears canvas before generation
- Auto-fits view to content

## Installation

The component is already included in the Cosmic Canvas project. No additional installation needed.

## Basic Usage

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { MindMapGenerator, type MindMapNode } from '@/components/MindMapGenerator'

// Define your mind map data
const myMindMapData: MindMapNode = {
  id: 'root',
  text: 'My Research Question',
  level: 0,
  children: [
    {
      id: 'theme-1',
      text: 'Main Theme 1',
      level: 1,
      children: [
        {
          id: 'finding-1-1',
          text: 'Key Finding 1',
          level: 2,
          children: [],
        },
        {
          id: 'finding-1-2',
          text: 'Key Finding 2',
          level: 2,
          children: [],
        },
      ],
    },
    {
      id: 'theme-2',
      text: 'Main Theme 2',
      level: 1,
      children: [
        {
          id: 'finding-2-1',
          text: 'Key Finding 3',
          level: 2,
          children: [],
        },
      ],
    },
  ],
}

// Render in your page
export default function MyPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Tldraw>
        <MindMapGenerator data={myMindMapData} />
      </Tldraw>
    </div>
  )
}
```

## Data Structure

### `MindMapNode` Interface

```typescript
interface MindMapNode {
  id: string          // Unique identifier for the node
  text: string        // Display text (title or finding)
  level: number       // Hierarchy level (0 = center, 1 = themes, 2+ = findings)
  children: MindMapNode[]  // Child nodes
}
```

### Hierarchy Levels

| Level | Purpose | Visual Style | Example |
|-------|---------|--------------|---------|
| **0** | Central Topic | Large blue ellipse, serif font XL | "Effects of Spaceflight on Cells" |
| **1** | Main Themes | Medium colored rectangles, sans-serif bold L | "Oxidative Stress", "Gene Expression" |
| **2+** | Sub-Topics/Findings | Text-only, sans-serif M | "Increased ROS production" |

## Design Specifications

### Visual Hierarchy

#### Central Topic (Level 0)
```typescript
{
  shape: 'ellipse',
  size: { width: 400, height: 150 },
  fill: 'solid',
  color: 'blue',
  font: 'serif',
  fontSize: 'xl',
  textColor: 'white'
}
```

#### Main Theme Nodes (Level 1)
```typescript
{
  shape: 'rectangle',
  size: { width: 'dynamic', height: 80 },
  fill: 'solid',
  colors: ['light-green', 'light-blue', 'light-red', 'light-violet', 'orange', 'yellow'],
  font: 'sans',
  fontSize: 'l',
  fontWeight: 'bold',
  textColor: 'black'
}
```

#### Sub-Topic Nodes (Level 2+)
```typescript
{
  shape: 'text-only',
  font: 'sans',
  fontSize: 'm',
  fontWeight: 'normal',
  textColor: 'black',
  align: 'start'
}
```

#### Connectors
```typescript
{
  style: 'curved',
  color: 'grey',
  dash: 'draw',
  arrowheadStart: 'none',
  arrowheadEnd: 'arrow',
  bend: 'calculated' // Based on angular separation
}
```

## Layout Algorithm

The component uses a **Radial Tree Layout** algorithm with the following logic:

### 1. Initialization
- Root node (level 0) placed at canvas center (0, 0)
- Define `RADIUS_STEP = 350` pixels between levels
- Estimate node dimensions based on text length

### 2. Recursive Positioning

For each node:
```
radius = level * RADIUS_STEP
angle = startAngle + (angularWidth / 2)

x = CENTER_X + radius * cos(angle)
y = CENTER_Y + radius * sin(angle)
```

### 3. Child Distribution
- Children distributed evenly within parent's angular sector
- Level 1 children: Full circle (2π radians)
- Level 2+ children: Parent's allocated sector

### 4. Collision Avoidance
- Calculate angular space needed based on node width
- Adjust separation dynamically
- Minimum angular separation: 0.15 radians
- Add collision padding: 40 pixels

### Polar to Cartesian Conversion
```typescript
const x = centerX + radius * Math.cos(angle)
const y = centerY + radius * Math.sin(angle)
```

## Configuration

Layout constants can be adjusted in the component:

```typescript
const LAYOUT_CONFIG = {
  RADIUS_STEP: 350,      // Distance between levels
  MIN_RADIUS: 280,       // Starting radius for level 1
  CANVAS_CENTER_X: 0,
  CANVAS_CENTER_Y: 0,
  
  CENTRAL_NODE: {
    width: 400,
    height: 150,
  },
  
  THEME_NODE: {
    minWidth: 160,
    maxWidth: 300,
    height: 80,
  },
  
  MIN_ANGULAR_SEPARATION: 0.15,  // Radians
  COLLISION_PADDING: 40,          // Pixels
}
```

## TLDraw Shape Mapping

| Mind Map Element | TLDraw Type | Key Properties |
|-----------------|-------------|----------------|
| Central Topic | `geo` | `geo: 'ellipse'`, `fill: 'solid'`, `color: 'blue'` |
| Main Theme | `geo` | `geo: 'rectangle'`, `fill: 'solid'`, `color: varies` |
| Sub-Topic | `text` | `autoSize: true`, `color: 'black'` |
| Connector | `arrow` | `bend: calculated`, `arrowheadEnd: 'arrow'` |
| Connection | `binding` | `terminal: 'start'/'end'`, `normalizedAnchor` |

## Advanced Features

### Binding-Based Connections

The component uses tldraw's binding system for robust connections:

```typescript
// Create arrow
editor.createShapes([arrowShape])

// Create bindings
editor.createBinding({
  type: 'arrow',
  fromId: arrowId,      // Arrow shape
  toId: nodeId,         // Target node
  props: {
    terminal: 'end',
    normalizedAnchor: { x: 0.5, y: 0.5 }
  }
})
```

**Benefits:**
- Connections maintained when nodes are dragged
- Automatic arrow routing
- Professional appearance

### Dynamic Node Sizing

Width calculation based on text length:

```typescript
// Level 1 (Themes)
const textWidth = text.length * CHAR_WIDTH.l
const width = Math.min(
  Math.max(textWidth + padding, minWidth),
  maxWidth
)

// Level 2+ (Findings)
const width = Math.min(
  text.length * CHAR_WIDTH.m,
  maxWidth
)
```

### Curved Arrows

Bend amount calculated from angular separation:

```typescript
const angleDiff = childAngle - parentAngle
const bend = Math.sin(angleDiff) * 20
```

This creates natural, organic curves that follow the radial layout.

## Examples

### Example 1: Simple Research Map

```typescript
const simpleMap: MindMapNode = {
  id: 'root',
  text: 'Machine Learning in Healthcare',
  level: 0,
  children: [
    {
      id: 'theme-1',
      text: 'Diagnostics',
      level: 1,
      children: [
        { id: 'f1', text: 'Image classification', level: 2, children: [] },
        { id: 'f2', text: 'Disease prediction', level: 2, children: [] },
      ],
    },
    {
      id: 'theme-2',
      text: 'Treatment Planning',
      level: 1,
      children: [
        { id: 'f3', text: 'Drug discovery', level: 2, children: [] },
        { id: 'f4', text: 'Personalized medicine', level: 2, children: [] },
      ],
    },
  ],
}
```

### Example 2: Complex Hierarchy

```typescript
const complexMap: MindMapNode = {
  id: 'root',
  text: 'Climate Change Impacts',
  level: 0,
  children: [
    {
      id: 'ecosystem',
      text: 'Ecosystem Effects',
      level: 1,
      children: [
        { id: 'biodiversity', text: 'Biodiversity loss', level: 2, children: [] },
        { id: 'migration', text: 'Species migration patterns', level: 2, children: [] },
        { id: 'extinction', text: 'Increased extinction rates', level: 2, children: [] },
      ],
    },
    {
      id: 'ocean',
      text: 'Ocean Acidification',
      level: 1,
      children: [
        { id: 'coral', text: 'Coral reef bleaching', level: 2, children: [] },
        { id: 'marine', text: 'Marine food web disruption', level: 2, children: [] },
      ],
    },
    {
      id: 'weather',
      text: 'Extreme Weather Events',
      level: 1,
      children: [
        { id: 'storms', text: 'Increased hurricane intensity', level: 2, children: [] },
        { id: 'drought', text: 'Prolonged droughts', level: 2, children: [] },
        { id: 'floods', text: 'Catastrophic flooding', level: 2, children: [] },
      ],
    },
    {
      id: 'agriculture',
      text: 'Agricultural Impacts',
      level: 1,
      children: [
        { id: 'crop', text: 'Crop yield reduction', level: 2, children: [] },
        { id: 'water', text: 'Water scarcity', level: 2, children: [] },
      ],
    },
  ],
}
```

## Demo Page

Visit `/mind-map-demo` to see the component in action with sample academic research data.

## Integration with Cosmic Canvas

To integrate with the existing research assistant:

```typescript
// In research-assistant.ts or canvas-generator.ts

function convertToMindMapFormat(
  researchQuestion: string,
  themes: Theme[],
  findings: Map<string, KeyFinding[]>
): MindMapNode {
  return {
    id: 'root',
    text: researchQuestion,
    level: 0,
    children: themes.map((theme, index) => ({
      id: `theme-${index}`,
      text: theme.name,
      level: 1,
      children: (findings.get(theme.id) || []).map((finding, fIndex) => ({
        id: `finding-${index}-${fIndex}`,
        text: finding.finding,
        level: 2,
        children: [],
      })),
    })),
  }
}
```

## Performance Considerations

- **Time Complexity**: O(n) where n is total number of nodes
- **Space Complexity**: O(n) for storing positioned nodes
- **Rendering**: Single atomic operation minimizes layout thrashing
- **Large Datasets**: Tested with 50+ themes and 200+ findings

### Optimization Tips

1. **Limit depth**: Keep hierarchy to 3-4 levels max for clarity
2. **Text length**: Keep node text concise (3-7 words for themes)
3. **Child count**: Aim for 5-8 children per node for best visual balance
4. **Batch operations**: Generate entire map at once rather than incremental updates

## Troubleshooting

### Issue: Nodes Overlapping
**Solution**: Increase `COLLISION_PADDING` or `MIN_ANGULAR_SEPARATION`

### Issue: Canvas Too Large/Small
**Solution**: Adjust `RADIUS_STEP` to control spacing between levels

### Issue: Text Truncated
**Solution**: Increase `maxWidth` in `THEME_NODE` or `FINDING_NODE` config

### Issue: Colors Repeating
**Solution**: Add more colors to `THEME_COLORS` array

## Technical Implementation Details

### Atomic Operation Wrapper

```typescript
editor.run(() => {
  // All operations here are batched
  editor.deleteShapes(existingShapes)
  editor.createShapes(shapes)
  editor.createBinding(bindings)
})
// Single undo removes entire mind map
```

### Shape Creation Sequence

1. **Nodes First**: Create all geo and text shapes
2. **Arrows Second**: Create connector shapes
3. **Bindings Last**: Link arrows to nodes

This order ensures proper references and prevents missing shape errors.

### Coordinate System

- **Origin**: Center of canvas (0, 0)
- **Units**: Pixels
- **Angles**: Radians (0 = right, π/2 = down, π = left, 3π/2 = up)
- **Y-axis**: Positive downward (standard canvas convention)

## Future Enhancements

Potential improvements:
- [ ] Recursive sub-themes (level 3, 4, etc.)
- [ ] Interactive node expansion/collapse
- [ ] Export to PNG/SVG
- [ ] Custom color schemes
- [ ] Animation of generation process
- [ ] Force-directed refinement for collision resolution
- [ ] Support for weighted connections
- [ ] Node importance sizing

## License

Part of Cosmic Canvas project. MIT License.

## Credits

- Built with [tldraw](https://tldraw.dev/) - Excellent infinite canvas library
- Inspired by academic literature review workflows
- Radial tree layout based on classic information visualization principles

---

**For questions or improvements, please open an issue in the Cosmic Canvas repository.**
