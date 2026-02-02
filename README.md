# Recipe & Meal Planning Platform

A full-stack web application for creating recipes, planning weekly meals, tracking cooking history, and calculating real-world costs — built with real cooking workflows in mind.

## Overview

This application is a recipe, meal planning, and cost-calculation platform designed to reflect real-world cooking workflows.

Users can create their own recipes using ingredients provided by the app and instantly calculate the cost of preparing a dish. When creating a recipe, users define a recipe name, portion size, and description. The combination of name and portion ensures uniqueness, allowing multiple variations of the same dish for different serving sizes. Recipes can be kept private or shared publicly with other users.

If the actual purchase price of an ingredient differs from the stored value, users can override the price at the recipe level without affecting the global ingredient data. When an ingredient is not available in the system, users can create and save their own custom ingredients for personal use. These user-created ingredients can later be reviewed by an administrator and, if approved, made publicly available to all users.

Recipes can be organized using components (such as “Gravy”, “Dough”, or “Sauce”) to group ingredients by preparation stage. Both ingredients and cooking steps can be reordered, allowing users to structure recipes according to their preferred cooking sequence.

In addition to recipe creation, users can record dishes they have actually prepared. Each dish record is saved as an immutable snapshot, preserving ingredient quantities, prices, order, and notes exactly as they were at the time of cooking. This ensures historical accuracy even if the original recipe is modified later.

Users can also plan meals for the week by assigning recipes to specific days and meal types (breakfast, lunch, or dinner). A weekly dashboard provides a consolidated view of all planned meals, including total recipes, ingredients required, and estimated costs. This view can be used as a preparation guide and as a practical shopping list.

Future enhancements include nutrition and calorie calculations derived from ingredient data to further support informed meal planning.

# Table of Contents
<a name="table-of-contents"></a>
- [1. User Features](#user-features)
- [2. Admin Features](#admin-features)
- [3. Tech Stack & Architecture](#tech-stack--architecture-highlights)
- [4. Architecture Highlights](#architecture-highlights)
- [5. Future Enhancements](#future-enhancements)
  
## User Features

### Recipe Management
- Create custom recipes with a name, portion size, and description.
- Ensure recipe uniqueness using a combination of recipe name and portion size.
- Set recipes as private or public.
- Update recipes at any time, including ingredients, quantities, and instructions.
- Reorder ingredients and cooking steps to match personal cooking workflows.
- Organize recipes using components (e.g., Gravy, Dough, Sauce) to group ingredients by preparation stage.
- Delete recipes permanently; deleted recipes are no longer visible, even if previously public.

### Ingredient & Pricing Control
- Use ingredients provided by the application to build recipes.
- Override ingredient prices at the recipe level when actual purchase prices differ.
- Create custom ingredients when required ingredients are not available in the system.
- Save user-created ingredients for personal use without affecting global data.

### Dish History (Cooking Records)
- Record dishes that were actually prepared, including:
  - Meal type
  - Date and time
  - Optional comments or variations
- Each dish is stored as an immutable snapshot, preserving:
  - Ingredient order and quantities
  - Prices at the time of cooking
  - Recipe structure and notes
- View past dishes exactly as they were prepared, even if the original recipe changes later.
- Delete dish records if created by mistake.

### Discovery & Sharing
- Browse all public recipes shared by other users.
- View public recipes created by selected users.
- Keep full control over personal recipes and visibility.

### Weekly Meal Planning & Cost Insights
- Create weekly food plans by assigning recipes to:
  - Specific days
  - Meal types (breakfast, lunch, dinner)
- View a weekly dashboard summarizing:
  - Total meals planned
  - Total recipes used
  - Total ingredients required
  - Estimated total cost
- Break down costs:
  - Day-wise
  - Meal-wise
  - Recipe-wise
  - Ingredient-wise
- Use the plan as a shopping list and preparation guide for the week.

## Admin Features
### [Table of content](#table-of-contents)
### Ingredient Moderation
- Review ingredients created by users for accuracy and completeness.
- Approve validated ingredients to make them publicly available to all users.
- Ensure data consistency and prevent duplication across the ingredient catalog.

### Platform Data Integrity
- Maintain a clean and reliable ingredient database shared across users.
- Control which ingredients become globally visible without disrupting user-specific data.
- Support scalability by separating user-created data from public data.

## Tech Stack & Architecture Highlights

### Backend
- **Python / Flask** – Core backend framework for handling routing, business logic, and server-side rendering.
- **JWT Authentication** – Secure user authentication with role-based access control (User / Admin).
- **RESTful APIs** – Clean, structured endpoints for managing recipes, ingredients, dishes, and meal plans.
- **Server-Side Rendering (Jinja2)** – Dynamic HTML rendering for fast page loads and SEO-friendly views.

### Database & Data Modelling
- **MySQL** – Relational database designed with normalized schemas and strict data integrity.
- **Relational Design** – Clear separation between users, recipes, ingredients, units, dishes, and plans.
- **Stored Procedures** – Encapsulated complex business logic (unit conversions, ingredient updates, dependency handling) directly at the database layer.
- **Transactional Safety** – Carefully managed updates to ensure dependent data (e.g., recipes using ingredients) remains consistent.
- **Soft Deletes & Version Safety** – Historical records preserved using `is_active` flags and snapshot-based design.

### Unit & Ingredient Architecture
- **Dynamic Unit Conversion System** – Supports weight, volume, and discrete units with automatic normalization.
- **User-Specific vs Public Data** – Ingredient ownership and visibility handled at the data level.
- **State Comparison Logic** – Before/after state tracking ensures safe updates to dependent recipe data.

### Frontend
- **HTML5 & CSS3** — Semantic markup and clean layouts.
- **Bootstrap** — Responsive design optimized for desktop and mobile.
- **Vanilla JavaScript** — Dynamic UI interactions (reordering, conditional rendering, form handling).
- **Progressive Enhancement** — Application remains usable without heavy frontend frameworks.

### Architecture Principles
- Separation of Concerns – Clear boundaries between routes, services, templates, and database logic.
- Role-Based Design – Backend-enforced permissions rather than UI-only restrictions.
- Real-World Business Rules – Handles mutable recipes, immutable cooking history, and dependent data safely.
- Scalable by Design – Ready for future extensions like nutrition data, analytics, and advanced planning features.

### Tech Stack Summary

**Backend**  
- Python  
- Flask – lightweight web framework  
- JWT Authentication  
- Jinja2 – server-side rendering  

**Database**  
- MySQL  
- SQL – complex queries, joins, stored procedures  
- Transactional operations  

**Frontend**  
- HTML5 and CSS3 (semantic markup)  
- Bootstrap – responsive layout and UI components  
- Vanilla JavaScript – dynamic form handling  

**Authorization & Roles**  
- Role-based access control  
  - User  
  - Admin  

**Version Control**  
- Git  
- GitHub  

## Architecture Highlights

This project is designed as a server-rendered, database-driven web application with a strong focus on clean backend logic, data consistency, and real-world feature behavior.

- **Backend Architecture** — Flask structured with clear separation of concerns (routes, business logic, database layer)  
- **Authentication & Authorization** — JWT-based with role-based protected routes  
- **Data Modelling & Integrity** — Relational schema, foreign keys, transactions, snapshot-based dish history  
- **Ordering & Reordering Logic** — Position-based, safe movement of ingredients/steps/components  
- **Admin Moderation Workflow** — User-created → admin review → public ingredients  
- **Planning & Cost Calculation** — Weekly aggregation, multi-level cost breakdown  

## Future Enhancements (Planned)
- Nutrition & calorie calculations based on ingredient data  
- Advanced cost analytics and historical trend tracking  
- Improved search and filtering for public recipes  
- Enhanced admin review workflows  

---

Built with ❤️ for home cooks who care about cost, planning, and cooking history.
