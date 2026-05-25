 critical actions

**Components:**

- **Toast Notifications**
  - Position: Top-right corner
  - Duration: 5 seconds (auto-dismiss)
  - Types: Success (green), Warning (yellow), Error (red), Info (blue)
  - Action: Optional action button
  - Dismissible: X button to close

- **Inline Errors**
  - Position: Below relevant field
  - Icon: Error icon
  - Color: Red text
  - Message: Specific, actionable
  - Example: "Database name is required"

- **Modal Errors**
  - Use: For critical errors
  - Blocking: Prevent other actions
  - Content: Error message + recovery steps
  - Actions: Retry, Cancel, Contact Support

- **Error Messages**
  - Clear: Explain what went wrong
  - Actionable: Tell user what to do
  - Technical: Include error code for support
  - Example: "Failed to connect to PROD_DB1. Check database is running. (Error: SQL1032N)"

### 7.4 Loading States

**User Need:** Visual feedback during operations; prevent confusion

**Requirements:**

- **Skeleton Screens**
  - Use: Initial page load
  - Animation: Shimmer effect
  - Layout: Match final content structure

- **Spinners**
  - Use: Button actions, API calls
  - Size: Match context (small/medium/large)
  - Position: Center of loading area
  - Text: Optional loading message

- **Progress Indicators**
  - Use: Long-running operations
  - Type: Linear or circular
  - Percentage: Show if calculable
  - Cancellable: Provide cancel option

### 7.5 Responsive Design

**User Need:** Work on any device; 3 AM phone access

**Requirements:**

| Element | Mobile (<672px) | Tablet (672-1056px) | Desktop (>1056px) |
|---------|-----------------|---------------------|-------------------|
| Navigation | Overlay | Collapsible | Expanded |
| Cards | 1 column | 2 columns | 3-4 columns |
| Tables | Horizontal scroll | Responsive | Full width |
| Modals | Full screen | Centered | Centered |
| Font size | 14px base | 15px base | 16px base |
| Touch targets | 48x48px min | 44x44px min | 40x40px min |

### 7.6 Dark Mode Support

**User Need:** Reduce eye strain during night shifts; personal preference

**Requirements:**

- **Color Palette**
  - Background: Carbon Gray 100 (#161616)
  - Surface: Carbon Gray 90 (#262626)
  - Text: Carbon Gray 10 (#f4f4f4)
  - Status colors: Adjusted for dark background

- **Toggle**
  - Position: User profile dropdown
  - Persist: Save preference
  - System: Respect OS preference
  - Smooth: Transition between modes

---

## 8. Component Library Requirements

### 8.1 Carbon Design System Components

**Required Components:**

- **Buttons**: Primary, Secondary, Ghost, Danger
- **Forms**: TextInput, TextArea, Select, Checkbox, Radio
- **Data Display**: DataTable, Tag, ProgressBar, Accordion
- **Navigation**: HeaderNav, SideNav, Tabs, Breadcrumb
- **Feedback**: Toast, Modal, InlineNotification, Loading
- **Layout**: Grid, Tile, StructuredList

### 8.2 Custom Components

**Components to Build:**

1. **HealthCard** - Status display with traffic lights
2. **CriticalAlert** - Full-screen warning overlay
3. **CommandExecutor** - Safe command execution panel
4. **TaskRunner** - Automated task execution interface
5. **AIAnalysis** - Dual-language explanation display
6. **DocumentSearch** - Search results with AI summary
7. **LogCollector** - Collection configuration and progress

---

## 9. Visual Design Specifications

### 9.1 Typography

**Font Family:** IBM Plex Sans

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 32px | Semi-bold | 1.25 |
| H2 | 24px | Semi-bold | 1.3 |
| H3 | 20px | Semi-bold | 1.4 |
| H4 | 18px | Semi-bold | 1.4 |
| Body | 16px | Regular | 1.5 |
| Small | 14px | Regular | 1.5 |
| Code | 14px | Mono | 1.5 |

### 9.2 Color Palette

**Status Colors:**
- Success: #24A148 (Green)
- Warning: #F1C21B (Yellow)
- Error: #DA1E28 (Red)
- Info: #0F62FE (Blue)
- Unknown: #8D8D8D (Gray)

**UI Colors:**
- Primary: #0F62FE (IBM Blue)
- Background: #FFFFFF (White)
- Surface: #F4F4F4 (Light Gray)
- Border: #E0E0E0 (Gray)
- Text: #161616 (Black)

### 9.3 Spacing Scale

**8px Base Unit:**
- XS: 4px (0.5x)
- S: 8px (1x)
- M: 16px (2x)
- L: 24px (3x)
- XL: 32px (4x)
- XXL: 48px (6x)

### 9.4 Elevation (Shadows)

- **Level 1**: 0 1px 2px rgba(0,0,0,0.1)
- **Level 2**: 0 2px 4px rgba(0,0,0,0.1)
- **Level 3**: 0 4px 8px rgba(0,0,0,0.15)
- **Level 4**: 0 8px 16px rgba(0,0,0,0.2)

---

## 10. Animation & Transitions

### 10.1 Timing Functions

- **Standard**: ease-in-out (0.3s)
- **Enter**: ease-out (0.2s)
- **Exit**: ease-in (0.15s)
- **Emphasis**: cubic-bezier(0.4, 0, 0.2, 1)

### 10.2 Animation Guidelines

- **Subtle**: Use for feedback (hover, focus)
- **Purposeful**: Guide user attention
- **Fast**: Keep under 300ms
- **Reducible**: Respect prefers-reduced-motion

---

## 11. Implementation Priorities

### Phase 1: Foundation (Week 1)
1. Navigation structure
2. Responsive layout
3. Color system
4. Typography
5. Basic components

### Phase 2: Core Features (Week 2-3)
1. Dashboard health cards
2. Daily tasks interface
3. RCA analysis display
4. Command execution panel

### Phase 3: Advanced Features (Week 4)
1. Document search
2. Log collector
3. History views
4. Export functions

### Phase 4: Polish (Week 5)
1. Animations
2. Dark mode
3. Accessibility audit
4. Performance optimization

---

## 12. Success Metrics

### Usability Metrics
- **Task Completion Rate**: >95%
- **Time on Task**: <50% of current time
- **Error Rate**: <5%
- **User Satisfaction**: >4.5/5

### Performance Metrics
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Lighthouse Score**: >90

### Accessibility Metrics
- **WCAG 2.1 AA**: 100% compliance
- **Keyboard Navigation**: All features accessible
- **Screen Reader**: Full compatibility

---

## Appendix: Wireframe References

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [☰] DB2 Day 2 Ops Dashboard    [🔔 2]  [👤 Sarah]         │
├─────────────────────────────────────────────────────────────┤
│ │                                                           │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│ │  │ 🟢 Pod   │  │ 🟢 DB2   │  │ 🟡 Store │              │
│ │  │ Health   │  │ Engine   │  │ age      │              │
│ │  └──────────┘  └──────────┘  └──────────┘              │
│ │                                                           │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│ │  │ 🟢 Backup│  │ 🟢 HADR  │  │ 🟢 Secure│              │
│ │  │          │  │          │  │          │              │
│ │  └──────────┘  └──────────┘  └──────────┘              │
│ │                                                           │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────┐
│ [☰] DB2 Ops [🔔]│
├─────────────────┤
│                 │
│ ┌─────────────┐ │
│ │ 🟢 Pod      │ │
│ │ Health      │ │
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │ 🟢 DB2      │ │
│ │ Engine      │ │
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │ 🟡 Storage  │ │
│ │             │ │
│ └─────────────┘ │
│                 │
└─────────────────┘
```

---

## Document Version

- **Version**: 1.0
- **Date**: 2026-05-25
- **Author**: Bob (Plan Mode)
- **Status**: Ready for Implementation

---

## Next Steps

1. **Review with Stakeholders**: Validate requirements with Sarah and Mike
2. **Create Design Mockups**: High-fidelity designs in Figma
3. **Build Component Library**: Implement reusable components
4. **Develop Features**: Follow implementation roadmap
5. **User Testing**: Validate with real DBAs
6. **Iterate**: Refine based on feedback
