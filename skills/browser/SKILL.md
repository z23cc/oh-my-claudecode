---
name: browser
description: Browser automation via agent-browser CLI for UI testing, web scraping, and verification
---

# Browser Automation

Browser automation via Vercel's agent-browser CLI. Uses ref-based selection (@e1, @e2) from accessibility snapshots.

## Setup

```bash
command -v agent-browser >/dev/null 2>&1 && echo "OK" || echo "MISSING: npm i -g agent-browser && agent-browser install"
```

## Core Workflow

1. **Open** URL
2. **Snapshot** to get refs
3. **Interact** via refs
4. **Re-snapshot** after DOM changes

```bash
agent-browser open https://example.com
agent-browser snapshot -i              # Interactive elements with refs
agent-browser click @e1
agent-browser wait --load networkidle  # Wait for SPA to settle
agent-browser snapshot -i              # Re-snapshot after change
```

## Essential Commands

### Navigation
```bash
agent-browser open <url>       # Navigate
agent-browser back / forward   # History
agent-browser reload           # Reload
agent-browser close            # Close browser
```

### Snapshots
```bash
agent-browser snapshot           # Full accessibility tree
agent-browser snapshot -i        # Interactive only (recommended)
agent-browser snapshot -i --json # JSON for parsing
agent-browser snapshot -d 3      # Limit depth
agent-browser snapshot -s "#main" # Scope to selector
```

### Interactions
```bash
agent-browser click @e1              # Click
agent-browser fill @e1 "text"        # Clear + fill input
agent-browser type @e1 "text"        # Type without clearing
agent-browser press Enter            # Key press
agent-browser hover @e1              # Hover
agent-browser check @e1              # Check checkbox
agent-browser select @e1 "option"    # Dropdown
agent-browser scroll down 500        # Scroll
agent-browser scrollintoview @e1     # Scroll element visible
```

### Get Info
```bash
agent-browser get text @e1       # Element text
agent-browser get value @e1      # Input value
agent-browser get attr href @e1  # Attribute
agent-browser get title          # Page title
agent-browser get url            # Current URL
```

### Wait
```bash
agent-browser wait @e1                 # Wait for element visible
agent-browser wait 2000                # Wait milliseconds
agent-browser wait --text "Success"    # Wait for text
agent-browser wait --url "**/dashboard" # Wait for URL pattern
agent-browser wait --load networkidle  # Wait for network idle
```

### Screenshots
```bash
agent-browser screenshot              # Viewport to stdout
agent-browser screenshot out.png      # Save to file
agent-browser screenshot --full       # Full page
```

### Semantic Locators
```bash
agent-browser find role button click --name "Submit"
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "user@test.com"
```

## Sessions (Parallel Browsers)
```bash
agent-browser --session test1 open site-a.com
agent-browser --session test2 open site-b.com
agent-browser session list
```

## Auth State Persistence
```bash
agent-browser state save auth.json    # Save after login
agent-browser state load auth.json    # Reuse later
```

## Debugging
```bash
agent-browser --headed open example.com  # Show browser window
agent-browser console                    # View console messages
agent-browser errors                     # View page errors
```

## Troubleshooting

- **"Browser not launched"**: `pkill -f agent-browser && agent-browser open <url>`
- **Element not found**: Re-snapshot after page changes
- **`--headed` not showing**: Kill daemon first, then reopen
