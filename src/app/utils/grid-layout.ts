// Grid Layout Utilities for Life in Weeks
// Implements Gina's complex row-breaking algorithm

export interface GridBox {
  type: 'birthday' | 'event' | 'week'
  label: string
  date: string
  tooltip: string
  borderClass: string
  backgroundClass: string
  age?: number
  year?: number
  eventType?: 'personal' | 'world' | 'president'  // Type of event for styling
}

export interface RowBreakCalculation {
  currentBoxes: number
  newBoxWidth: number
  totalAfterAdd: number
  shouldBreak: boolean
}

// Responsive layout based on actual measured container widths
export const GRID_CONSTANTS = {
  ultrawide: {
    containerWidth: 1440,     // 1800px × 80% = 1440px available
    basePadding: 8,           
    charWidth: 8,             
    weekBoxMinWidth: 20,      
  },
  wide: {
    containerWidth: 1190,     // 1400px × 85% = 1190px available
    basePadding: 8,           
    charWidth: 8,             
    weekBoxMinWidth: 20,      
  },
  desktop: {
    containerWidth: 668,      // Actual measured width at desktop
    basePadding: 7,           // Slightly reduced from 8 to match tighter spacing
    charWidth: 8,             
    weekBoxMinWidth: 20,      
  },
  tablet: {
    containerWidth: 573,      // Actual measured width at 769px viewport
    basePadding: 4,           // Slightly reduced from 5 to match tighter spacing
    charWidth: 7,             
    weekBoxMinWidth: 17,      
  },
  mobile: {
    containerWidth: 737,      // 768px viewport × 96% = 737px available
    basePadding: 3,           // Slightly reduced from 4 to match tighter spacing  
    charWidth: 6,
    weekBoxMinWidth: 15,
  },
  extraSmall: {
    containerWidth: 307,      // TODO: Measure actual width
    basePadding: 2,           // Slightly reduced from 3 to match tighter spacing
    charWidth: 5,
    weekBoxMinWidth: 12,
  },
  compact: {
    // Compact mode uses same container widths but smaller cell dimensions
    ultrawide: {
      containerWidth: 1440,   // Same as normal ultrawide
      basePadding: 1,
      charWidth: 8,
      weekBoxMinWidth: 8,
    },
    wide: {
      containerWidth: 1190,   // Same as normal wide
      basePadding: 1,
      charWidth: 8,
      weekBoxMinWidth: 8,
    },
    desktop: {
      containerWidth: 668,    // Same as normal desktop
      basePadding: 1,
      charWidth: 8,
      weekBoxMinWidth: 8,
    },
    tablet: {
      containerWidth: 573,    // Same as normal tablet
      basePadding: 1,
      charWidth: 7,
      weekBoxMinWidth: 6,
    },
    mobile: {
      containerWidth: 461,    // Same as normal mobile
      basePadding: 0,
      charWidth: 6,
      weekBoxMinWidth: 5,
    },
    extraSmall: {
      containerWidth: 307,    // Same as normal extraSmall
      basePadding: 0,
      charWidth: 5,
      weekBoxMinWidth: 4,
    }
  }
}

/**
 * Calculate dynamic grid constants based on actual measured container width
 */
export function calculateDynamicConstants(containerWidth: number, compactMode: boolean = false) {
  // Calculate character width based on actual CSS font sizes
  let charWidth: number
  let basePadding: number
  let weekBoxMinWidth: number
  
  if (compactMode) {
    // Compact mode: match CSS font-size constraints
    if (containerWidth <= 480) {
      charWidth = 7   // CSS: font-size: 7px
      basePadding = 2 // CSS: padding: 0px 2px = 4px total
      weekBoxMinWidth = 14 // CSS: 8px min-width + 4px padding + 2px borders
    } else if (containerWidth <= 768) {
      charWidth = 8   // CSS: font-size: 8px
      basePadding = 2 // CSS: padding: 0px 2px = 4px total
      weekBoxMinWidth = 14 // CSS: 8px min-width + 4px padding + 2px borders
    } else {
      charWidth = 10  // CSS: font-size: 12px (desktop compact)
      basePadding = 2 // CSS: padding: 0px 2px = 4px total
      weekBoxMinWidth = 16 // Slightly larger for desktop
    }
  } else {
    // Normal mode: existing logic (working fine)
    if (containerWidth < 350) {
      charWidth = 5  // Extra small mobile
    } else if (containerWidth < 500) {
      charWidth = 6  // Mobile
    } else if (containerWidth < 650) {
      charWidth = 7  // Tablet
    } else {
      charWidth = 8  // Desktop and larger
    }
    basePadding = Math.max(2, Math.min(8, Math.floor(containerWidth / 150)))
    weekBoxMinWidth = Math.max(12, Math.min(20, Math.floor(containerWidth / 50)))
  }
  
  // Apply safety margin: use 95% of container width to prevent edge-case overflow
  const safeContainerWidth = Math.floor(containerWidth * 0.95)
  
  const baseConstants = {
    containerWidth: safeContainerWidth, // Use safety margin
    basePadding,
    charWidth,
    weekBoxMinWidth
  }
  
  return baseConstants
}

/**
 * Get appropriate constants based on current viewport width and compact mode
 * Now supports dynamic container width measurement
 */
export function getResponsiveConstants(compactMode: boolean = false, measuredWidth?: number) {
  // If we have a measured width, use dynamic calculation
  if (measuredWidth && measuredWidth > 0) {
    return calculateDynamicConstants(measuredWidth, compactMode)
  }
  
  // Fallback to static breakpoint system
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return compactMode ? GRID_CONSTANTS.compact.desktop : GRID_CONSTANTS.desktop
  }
  
  const width = window.innerWidth
  
  // Determine which breakpoint we're in (matching CSS media queries)
  let breakpoint: 'ultrawide' | 'wide' | 'desktop' | 'tablet' | 'mobile' | 'extraSmall'
  if (width < 480) {
    breakpoint = 'extraSmall'
  } else if (width <= 768) {  // Changed from < to <= to match CSS
    breakpoint = 'mobile'
  } else if (width < 1024) {
    breakpoint = 'tablet'
  } else if (width < 1400) {
    breakpoint = 'desktop'
  } else if (width < 1800) {
    breakpoint = 'wide'
  } else {
    breakpoint = 'ultrawide'
  }
  
  // Return compact or normal constants for the same breakpoint
  if (compactMode) {
    return GRID_CONSTANTS.compact[breakpoint]
  } else {
    return GRID_CONSTANTS[breakpoint]
  }
}

/**
 * Calculate the absolute pixel width for empty week cells
 */
export function calculateWeekCellWidth(compactMode: boolean = false): number {
  const borderWidth = 2  // 1px border on each side
  const gapWidth = 1     // 1px gap between cells
  
  if (compactMode) {
    // Compact mode: squeeze empty cells to 9px total
    // 4px content + 2px padding + 2px borders + 1px gap = 9px
    return 4 + 2 + borderWidth + gapWidth  // Ultra-compressed empty cells
  } else {
    // Normal mode: square cells (width = total CSS height)
    // Use viewport width, not container width, to match CSS media queries
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    // Mobile (≤768px viewport): 18px total, Desktop/Tablet (>768px): 26px total
    return viewportWidth <= 768 ? 18 : 26
  }
}

/**
 * Calculate the absolute pixel width a text box will take up
 */
export function calculateBoxWidth(label: string, compactMode: boolean = false, measuredWidth?: number): number {
  const constants = getResponsiveConstants(compactMode, measuredWidth)
  const labelLength = label.length
  
  // Calculate width as: padding + (characters * char width) + padding + border + gap
  const textWidth = labelLength * constants.charWidth
  const totalPadding = constants.basePadding * 2  // Left + right padding
  const borderWidth = 2  // 1px border on each side
  const gapWidth = 1     // 1px gap between cells
  
  return textWidth + totalPadding + borderWidth + gapWidth
}

/**
 * Simple greedy row breaking using absolute pixel widths
 * Break when adding next box would exceed container width
 */
function shouldBreakBeforeBox(currentRowWidth: number, nextBoxLabel: string, compactMode: boolean = false, measuredWidth?: number): boolean {
  const constants = getResponsiveConstants(compactMode, measuredWidth)
  const nextBoxWidth = nextBoxLabel ? 
    calculateBoxWidth(nextBoxLabel, compactMode, measuredWidth) : 
    calculateWeekCellWidth(compactMode)  // Use new week cell width function
  const totalAfterAdd = currentRowWidth + nextBoxWidth
  
  return totalAfterAdd >= constants.containerWidth
}

/**
 * Determine if adding a new box would exceed the container width
 * Uses absolute pixel calculations
 */
export function shouldBreakRow(currentWidth: number, newBoxLabel: string, compactMode: boolean = false, measuredWidth?: number): RowBreakCalculation {
  const constants = getResponsiveConstants(compactMode, measuredWidth)
  const newBoxWidth = calculateBoxWidth(newBoxLabel, compactMode, measuredWidth)
  const totalAfterAdd = currentWidth + newBoxWidth
  
  return {
    currentBoxes: currentWidth,  // Now represents pixels, not box count
    newBoxWidth,
    totalAfterAdd,
    shouldBreak: totalAfterAdd >= constants.containerWidth
  }
}

/**
 * Process boxes into rows using absolute pixel width calculations
 * Break when adding next box would exceed container width
 */
export function processBoxesIntoRows(boxes: GridBox[], compactMode: boolean = false, measuredWidth?: number): GridBox[][] {
  const rows: GridBox[][] = []
  let currentRow: GridBox[] = []
  let currentRowWidth = 0
  
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]
    const boxWidth = box.type === 'week' ? 
      calculateWeekCellWidth(compactMode) :  // Use new week cell width function
      calculateBoxWidth(box.label, compactMode, measuredWidth)
    
    // Check if we need to break before adding this box (width-based only)
    const shouldBreakWidth = shouldBreakBeforeBox(currentRowWidth, box.label, compactMode, measuredWidth)
    
    if (shouldBreakWidth && currentRow.length > 0) {
      // Finish current row and start new one
      rows.push([...currentRow])
      currentRow = []
      currentRowWidth = 0
    }
    
    // Add box to current row
    currentRow.push(box)
    currentRowWidth += boxWidth
  }
  
  // Add final row if it has content
  if (currentRow.length > 0) {
    rows.push(currentRow)
  }
  
  return rows
}

/**
 * Group boxes by decade for navigation anchors
 * Matches Gina's decade section logic
 */
export interface DecadeSection {
  decadeId: string
  age: number
  boxes: GridBox[]
}

export function groupBoxesByDecade(boxes: GridBox[]): DecadeSection[] {
  const decades: Map<number, GridBox[]> = new Map()
  
  for (const box of boxes) {
    if (box.age !== undefined) {
      const decade = Math.floor(box.age / 10) * 10
      
      if (!decades.has(decade)) {
        decades.set(decade, [])
      }
      
      decades.get(decade)!.push(box)
    }
  }
  
  // Convert to sorted array
  return Array.from(decades.entries())
    .sort(([a], [b]) => a - b)
    .map(([decade, boxes]) => ({
      decadeId: `decade-${decade}`,
      age: decade,
      boxes
    }))
}

/**
 * Create tooltip text with support for event dates and privacy settings
 */
export function createTooltip(
  weekStartDate: string,
  description?: string,
  eventDate?: string,
  eventType?: 'personal' | 'world' | 'president',
  showPersonalEventDates: boolean = true,
  doing?: string, 
  association?: string, 
  based?: string
): string {
  // Use event date if available and appropriate
  const dateToShow = eventDate || weekStartDate
  
  // Determine if we should show full date based on event type and privacy setting
  const showFullDate = eventType !== 'personal' || showPersonalEventDates
  
  const formattedDate = formatTooltipDateLocal(dateToShow, showFullDate)
  
  if (description) {
    return `${formattedDate} – ${description}`
  }
  
  // Build context string for empty weeks
  const contexts: string[] = []
  
  if (doing) {
    contexts.push(doing)
  }
  
  if (association) {
    contexts.push(`at ${association}`)
  }
  
  if (based) {
    contexts.push(`based in ${based}`)
  }
  
  const contextString = contexts.join(', ')
  return `${formattedDate} – ${contextString}`
}

/**
 * Parse date string (YYYY-MM-DD) without timezone issues
 * Avoids UTC conversion that causes 1-day offset in some timezones
 */
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed
}

/**
 * Format date for tooltip display (Jan 2, 2006 format)
 */
function formatTooltipDateLocal(dateString: string, showFullDate: boolean = true): string {
  const date = parseLocalDate(dateString)
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  
  if (showFullDate) {
    const day = date.getDate()
    return `${month} ${day}, ${year}`
  } else {
    return `${month} ${year}`
  }
}

/**
 * Create birthday box label matching Gina's format
 */
export function createBirthdayLabel(age: number, year: number, compactMode: boolean = false): string {
  if (compactMode) {
    return `🎂${age}`
  }
  return `🎂 ${age} in ${year}`
}

/**
 * Create birthday tooltip matching Gina's format
 */
export function createBirthdayTooltip(date: string, age: number, showFullDate: boolean = false): string {
  const formattedDate = formatTooltipDateLocal(date, showFullDate)
  const yearText = age === 1 ? "year" : "years"
  return `${formattedDate} – Turned ${age} ${yearText} old`
}

/**
 * Extract first emoji from a string
 */
export function extractFirstEmoji(text: string): string | null {
  // More comprehensive emoji regex covering all major Unicode emoji blocks
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]{2}|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]/u
  
  const match = text.match(emojiRegex)
  if (match) {
    // Handle flag emojis (which are 2 characters)
    if (match[0].length === 1 && match.index !== undefined) {
      const nextChar = text.charAt(match.index + 1)
      if (nextChar && /[\u{1F1E0}-\u{1F1FF}]/u.test(nextChar)) {
        return match[0] + nextChar // Return the full flag emoji
      }
    }
    return match[0]
  }
  return null
}

/**
 * Create compact event label (emoji only, or empty if no emoji)
 */
export function createCompactEventLabel(headline: string): string {
  const emoji = extractFirstEmoji(headline)
  return emoji || '' // Return emoji or empty string
}

/**
 * Determine if event should be shown in compact mode
 */
export function shouldShowInCompact(headline: string): boolean {
  return extractFirstEmoji(headline) !== null
}

