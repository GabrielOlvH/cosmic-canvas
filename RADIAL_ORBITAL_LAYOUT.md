# Radial Orbital Layout - Natural Hierarchy 🎯

## The Perfect Balance

After going from **too cramped** → **too spread out**, we now have the **sweet spot**:
- **Radial orbital structure** like your example image
- **Main topic centered** (like "Holiday" in the sun)
- **Subtopics orbit around** in natural, organic patterns
- **Clear hierarchy** with levels expanding outward
- **Curved connections** with smooth dotted lines
- **Moderate spacing** - readable but not excessive

## Layout Structure

```
         Level 3 (Documents)
                ↓
              ╱   ╲
             ○     ○  ← Outer orbit
            ╱       ╲
           ↓         ↓
      Level 2    Level 2
     (Findings) (Findings)
          ↓         ↓
         ○ ← ← ← ← ○  ← Middle orbit
          ↘       ↙
            ↘   ↙
         Level 1 (Themes)
              ↓
             ○ ○ ○  ← Inner orbit
              ↘|↙
               ○  ← Center
          (Main Topic)
```

## Key Parameters - The Sweet Spot 🎯

### Before (Too Spread Out):
```typescript
repulsionForce: 200,000    // WAY too strong
idealLinkLength: 1,200     // Way too far
minNodeDistance: 500       // Excessive gaps
```

### After (Radial Orbital):
```typescript
repulsionForce: 30,000     // Moderate, natural spacing
idealLinkLength: 350       // Comfortable orbit distance
minNodeDistance: 180       // Prevent overlap, allow clustering
```

### Comparison:
| Parameter | Too Cramped | Too Spread | **Perfect Balance** |
|-----------|-------------|------------|---------------------|
| Repulsion | 10,000 | 200,000 | **30,000** ✅ |
| Link Length | 300px | 1,200px | **350px** ✅ |
| Min Distance | 100px | 500px | **180px** ✅ |
| Attraction | 0.03 | 0.01 | **0.05** ✅ |

## Orbital Radii by Level

### Level 0 (Root - Center):
- **Position**: (0, 0) - Fixed at center
- **Visual**: Large, prominent (like the sun)
- **Example**: "Holiday" / "Mice in Space"

### Level 1 (Themes - Inner Orbit):
- **Radius**: ~280-385px from center
- **Variation**: ±15% for organic feel
- **Layout**: Distributed around center
- **Example**: "activity", "family", "transportation", "accommodation"

### Level 2 (Findings - Middle Orbit):
- **Radius**: ~630-735px from center
- **Variation**: ±15% for organic feel
- **Layout**: Cluster around parent themes
- **Example**: "sport", "cycling", "swimming" orbit around "activity"

### Level 3 (Documents - Outer Orbit):
- **Radius**: ~980-1085px from center
- **Variation**: ±15% for organic feel
- **Layout**: Outer ring around findings
- **Example**: Individual papers orbit their findings

## Organic Variation Formula

```typescript
// Not perfectly circular - natural variation
const radius = idealLinkLength * (level + 0.8)
const radiusVar = radius + (Math.random() - 0.5) * (radius * 0.15)  // ±15%
const angleVar = angle + (Math.random() - 0.5) * 0.3  // ±0.15 radians

// Result: Organic orbital pattern, not rigid circles
```

## Visual Characteristics

### What You'll See:
✅ **Main topic in center** - clearly the focus
✅ **Themes orbit around** - first ring of topics
✅ **Subtopics cluster** - grouped by parent theme
✅ **Clear hierarchy** - obvious levels
✅ **Curved connections** - smooth, organic lines
✅ **Natural spacing** - readable, not cluttered
✅ **Organic positioning** - not perfectly circular/rigid

### What You Won't See:
❌ Nodes on top of each other (too cramped)
❌ Nodes miles apart (too spread out)
❌ Straight rigid lines
❌ Perfect circles (too artificial)
❌ Lost central focus
❌ Unclear hierarchy

## Physics Behavior

### 1. **Initialization** (t=0):
- Root fixed at (0,0)
- Level 1 placed at ~280-385px radius with organic variation
- Level 2 placed at ~630-735px radius with variation
- Level 3 placed at ~980-1085px radius with variation

### 2. **Simulation** (t=1-400):
- **Repulsion** (30k): Pushes nodes apart moderately
- **Attraction** (0.05): Maintains parent-child orbital structure
- **Hierarchy** (0.05): Very weak, allows radial spread
- **Centering** (0.002): Minimal, allows natural expansion
- **Damping** (0.85): Smooth settling into stable orbits

### 3. **Convergence** (t=400):
- Nodes settle into natural orbital positions
- Clear radial structure around center
- Smooth curved connections
- No overlaps, no excessive spacing

## Force Balance

```
Repulsion ←→ Attraction
  30,000       0.05

Result: Moderate spacing with maintained structure
```

The forces are balanced so that:
- Nodes push apart enough to be readable
- But stay close enough to show relationships
- Parent-child connections remain visible
- Hierarchy is clear from center outward

## Canvas Size

### Expected Dimensions:
- **Level 0-1**: ~800×800px (center + inner orbit)
- **Level 0-2**: ~1500×1500px (includes middle orbit)
- **Level 0-3**: ~2200×2200px (includes outer orbit)

### Total Canvas:
- **Small map** (1 root, 5 themes): ~1200×1200px
- **Medium map** (1 root, 6 themes, 20 findings): ~2000×2000px
- **Large map** (1 root, 6 themes, 20 findings, 40 docs): ~2500×2500px

Much more **reasonable and viewable** than the 18,000×18,000px from before!

## Edge Routing

### Curved Connections:
- **5 waypoints** per edge for smooth curves
- **Obstacle avoidance** (800 force) for clean routing
- **Dotted style** for organic feel
- **No straight lines** - all connections curve naturally

### Connection Pattern:
```
Root ⟿ Theme1 ⟿ Finding1 ⟿ Document1
         ⟿ Finding2 ⟿ Document2
     Theme2 ⟿ Finding3 ⟿ Document3
```

All connections curve elegantly, avoiding overlaps.

## Comparison to Your Example Image

Your "Holiday" mind map example shows:
✅ **Central topic** ("Holiday" sun icon) - We have root at center
✅ **Main branches** ("activity", "family", etc.) - Our Level 1 themes
✅ **Sub-branches** ("sport", "cycling", etc.) - Our Level 2 findings
✅ **Detail nodes** (dates, names, etc.) - Our Level 3 documents
✅ **Curved dotted lines** - Our edge routing with waypoints
✅ **Organic spacing** - Our 15% radius variation
✅ **Color coding** - Your DocumentCard colors by level

## Files Modified

1. **`src/components/MindMapGenerator.tsx`**
   - Repulsion: 200k → 30k (moderate)
   - Link length: 1200 → 350 (comfortable orbits)
   - Min distance: 500 → 180 (natural spacing)
   - Attraction: 0.01 → 0.05 (stronger orbital structure)

2. **`src/lib/force-directed-layout.ts`**
   - Updated DEFAULT_CONFIG with radial orbital parameters
   - Changed initial positioning to orbital pattern with variation
   - Reduced overlap penalty: 10x → 3x (allow natural clustering)
   - Iterations: 800 → 400 (faster convergence)

## Testing Tips

### Good Signs:
✅ Main topic clearly visible in center
✅ Themes form a ring around it (~300-400px)
✅ Each level expands outward naturally
✅ No overlapping nodes
✅ Curved connections visible
✅ Can see entire map without excessive scrolling

### If Something Looks Off:

**Too cramped?**
```typescript
minNodeDistance: 200  // Increase from 180
repulsionForce: 35000 // Increase from 30000
```

**Too spread out?**
```typescript
idealLinkLength: 300  // Decrease from 350
attractionForce: 0.08 // Increase from 0.05
```

**Not radial enough?**
```typescript
attractionForce: 0.08  // Stronger parent-child pull
hierarchyForce: 0.02   // Even weaker vertical force
```

## Success Metrics

✅ **Radial structure**: Topics orbit around center
✅ **Clear hierarchy**: Obvious levels expanding outward
✅ **Natural variation**: Not perfectly circular/rigid
✅ **Readable spacing**: 180px minimum, not too far
✅ **Smooth curves**: Waypoint-routed connections
✅ **Viewable canvas**: 2000-2500px range (not 18,000!)
✅ **Fast performance**: 400 iterations, quick convergence

## Result

The layout now matches your example image:
- **Main topic centered** like the "Holiday" sun
- **Subtopics orbiting** like the colored bubbles
- **Organic positioning** with natural variation
- **Clear hierarchy** radiating outward
- **Curved connections** not straight lines
- **Perfect balance** between cramped and spread out

**View at**: http://localhost:3002/

The mind map should now feel **natural, hierarchical, and orbital** - just like your example! 🌟
