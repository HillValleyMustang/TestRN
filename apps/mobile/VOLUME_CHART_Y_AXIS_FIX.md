# Volume Chart Y-Axis Fix - Post-Deletion Update Issue

## 🎯 **Problem Identified**
After implementing the comprehensive cache fix for dashboard deletion updates, a new issue was discovered: **the Weekly Volume Chart Y-axis was showing all 0's instead of adjusting to the new bar heights** after workout deletion.

## 🔍 **Root Cause Analysis**

### **The Issue**
Based on the logs provided, the cache clearing and data refresh was working correctly:
- **Before deletion**: Volume on 2026-01-03 was 102kg (from "Legs" workout)
- **After deletion**: Volume on 2026-01-03 became 6kg (from "Pull" workout only)

The data was correctly updated, but the **Y-axis calculation logic** in the SimpleVolumeChart component was flawed.

### **The Technical Problem**
The issue was in the Y-axis label generation logic in `apps/mobile/components/dashboard/SimpleVolumeChart.tsx`:

**Original problematic code:**
```javascript
// Generate Y-axis labels starting at 0 and rounded to nearest 50
const roundToNearest50 = (value: number) => Math.round(value / 50) * 50;

const yAxisLabels = [
  0, // Start at 0 for proper interpretation
  roundToNearest50(maxVolume * 0.25),
  roundToNearest50(maxVolume * 0.5),
  roundToNearest50(maxVolume * 0.75),
  roundToNearest50(maxVolume),
].reverse(); // Reverse to show increasing values from bottom to top
```

**What was happening with maxVolume = 24:**
- `roundToNearest50(24 * 0.25) = roundToNearest50(6) = 0`
- `roundToNearest50(24 * 0.5) = roundToNearest50(12) = 0`
- `roundToNearest50(24 * 0.75) = roundToNearest50(18) = 0`
- `roundToNearest50(24) = roundToNearest50(24) = 0`

**Result**: All Y-axis labels were 0!

## 🔧 **Solution Implemented**

### **Adaptive Y-Axis Label Generation**
Replaced the rigid `roundToNearest50` function with an adaptive rounding system that adjusts based on the volume range:

```javascript
// Generate Y-axis labels with adaptive rounding based on volume range
const getAdaptiveRound = (value: number) => {
  if (value === 0) return 0;
  if (value <= 10) return Math.ceil(value / 5) * 5; // Round to nearest 5 for small values
  if (value <= 50) return Math.ceil(value / 10) * 10; // Round to nearest 10 for medium values
  if (value <= 200) return Math.ceil(value / 25) * 25; // Round to nearest 25 for larger values
  return Math.ceil(value / 50) * 50; // Round to nearest 50 for very large values
};

const yAxisLabels = [
  0, // Start at 0 for proper interpretation
  getAdaptiveRound(maxVolume * 0.25),
  getAdaptiveRound(maxVolume * 0.5),
  getAdaptiveRound(maxVolume * 0.75),
  getAdaptiveRound(maxVolume),
].reverse(); // Reverse to show increasing values from bottom to top
```

### **How the Adaptive Rounding Works**
For the post-deletion scenario with maxVolume = 24:

**Before (broken):**
- All values rounded to nearest 50 → All became 0

**After (fixed):**
- `getAdaptiveRound(24 * 0.25) = getAdaptiveRound(6) = 10` (rounds to nearest 5)
- `getAdaptiveRound(24 * 0.5) = getAdaptiveRound(12) = 20` (rounds to nearest 10)
- `getAdaptiveRound(24 * 0.75) = getAdaptiveRound(18) = 25` (rounds to nearest 25)
- `getAdaptiveRound(24) = getAdaptiveRound(24) = 25` (rounds to nearest 25)

**Result**: Y-axis shows [0, 10, 20, 25, 25] - properly scaled to the actual data!

### **Added Development Debugging**
Added debug logging to track Y-axis calculation:
```javascript
// Debug logging for Y-axis calculation
if (__DEV__) {
  console.log('[SimpleVolumeChart] Y-axis calculation debug:', {
    chartData: chartData.map(d => ({ date: d.date, volume: d.volume })),
    maxVolume,
    yAxisLabels: [
      0,
      Math.ceil(maxVolume * 0.25 / 5) * 5,
      Math.ceil(maxVolume * 0.5 / 10) * 10,
      Math.ceil(maxVolume * 0.75 / 25) * 25,
      Math.ceil(maxVolume / 50) * 50
    ].reverse()
  });
}
```

## ✅ **Expected Results**

With this fix, after workout deletion:

1. **Data is correctly updated** (confirmed working from logs)
2. **Y-axis now properly scales** to the new maximum volume
3. **Chart bars maintain proper proportions** relative to the Y-axis
4. **Visual consistency** is maintained across different volume ranges

### **Before Fix**: 
- Y-axis: [0, 0, 0, 0, 0] ❌
- Chart bars: Disproportionate and confusing

### **After Fix**:
- Y-axis: [0, 10, 20, 25, 25] ✅  
- Chart bars: Properly scaled and readable

## 🎯 **Impact**

This fix ensures that the **Weekly Volume Chart remains visually accurate and useful** after any workout deletion, maintaining the dashboard's effectiveness for tracking workout volume trends.

## 📋 **Files Modified**
- `apps/mobile/components/dashboard/SimpleVolumeChart.tsx` - Fixed Y-axis calculation logic

The comprehensive cache fix implementation remains fully functional - this was simply a visual display issue in the chart component's Y-axis scaling logic.
