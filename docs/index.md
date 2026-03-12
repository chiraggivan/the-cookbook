# Index / Home Page (User Dashboard)

## Overview

The home page is the main landing screen after a user logs in.  
It serves as a personalized dashboard where users can quickly access their recipes, start planning meals, view their ingredients, and create new content.

**Purpose**:

- Provide an intuitive starting point for logged-in users
- Encourage immediate action (create recipe, view plans)
- Give a quick overview of the user's own content and activity
- Act as a hub linking to all major sections of the app

**Access**: Requires authentication (JWT-based login).  
Non-logged-in users are redirected to the login page.

## Navigation Bar (Top Fixed / Sticky)

Always visible at the top for easy navigation.

Links / Sections:

- **My Recipes** → List of recipes created by the current user
- **Food Plan** → Weekly meal planner dashboard
- **Dish Created** → User's cooking history or created dishes log (if separate from My Recipes)
- **My Ingredients** → Personal ingredient list with price overrides and inventory

**Additional Elements**:

- User profile dropdown (username, avatar, logout)
- Possible quick stats (e.g., total recipes created, weekly cost summary)

**Implementation Notes**:

- Built with Bootstrap navbar (responsive collapse on mobile)
- Active link highlighting based on current route
- Conditional rendering: Only shown after successful login

## Main Content: Personalized Dashboard

### Layout & Key Elements

- Clean, welcoming layout with sections/cards
- Prominent **"Create New Recipe"** button (usually at the top-center or floating action style)
  - Large, eye-catching button (e.g., Bootstrap primary button)
  - On click: Redirects to recipe creation form (`/recipes/new`)
- Quick overview cards or widgets (examples):
  - Recent recipes (last 3–5 created/edited)
  - Weekly meal plan summary (if plan exists)
  - Total saved recipes count
  - Estimated weekly grocery cost (if data available)
- Optional: Motivational message or tip (e.g., "Add your first recipe today!")

**No public/community feed**:

- Unlike earlier versions, there is no infinite scroll of open recipes from other users.
- All content is private/personal to the logged-in user.
- Focus is on the user's own data and actions.

### "Create New Recipe" Button

**Placement**: Top of the main content area (hero section)  
**Behavior**:

- Visible only to authenticated users
- Clicking opens the full recipe creation form
- May include a floating action button (FAB) on mobile for quick access

**Why prominent?**  
Encourages content creation as the core value of the app — users come to manage and grow their personal recipe collection.

### Technical Implementation

- **Frontend**:
  - Vanilla JavaScript for any dynamic elements (e.g., fetching recent recipes via Fetch API)
  - Bootstrap cards/grid for layout
  - Responsive design (mobile-first)

- **Backend**:
  - Route: `GET /` or `GET /home` (protected by login decorator)
  - Fetches user-specific data: recent recipes, plan summary, ingredient count
  - Returns rendered template with context (Jinja)

- **Security**:
  - All data queries filtered by `current_user.id`
  - No public endpoints on this page

### Data Flow (Simplified)
