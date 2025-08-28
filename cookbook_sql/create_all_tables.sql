-- Users: Stores user information for authentication and roles.
-- Columns: user_id, username, role, created_at.
-- Constraints: PRIMARY KEY (user_id), UNIQUE (username), CHECK (role IN ('user', 'admin')).
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients: Stores ingredients with unique names, base units, default prices, status flags, user submission and approval tracking, and admin notes.
-- Columns: ingredient_id, name, base_unit, default_price, is_active, end_date, created_at, submitted_by, approval_status, approved_by, approval_date, notes.
-- Constraints: PRIMARY KEY (ingredient_id), UNIQUE (name), CHECK (default_price > 0), CHECK (approval_status IN ('pending', 'approved', 'rejected', 'on hold')).
CREATE TABLE ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    base_unit VARCHAR(50) NOT NULL,
    default_price DECIMAL(10,2) NOT NULL CHECK (default_price > 0),
    submitted_by INT,
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'on hold')),
    approved_by INT,
    approval_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users (user_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Units: Defines valid units for each ingredient with conversion factors and status flags.
-- Columns: unit_id, ingredient_id, unit_name, conversion_factor, is_active, end_date, created_at.
-- Constraints: PRIMARY KEY (unit_id), FOREIGN KEY (ingredient_id), UNIQUE (ingredient_id, unit_name), CHECK (conversion_factor >= 0).
CREATE TABLE units (
    unit_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    unit_name VARCHAR(50) NOT NULL,
    conversion_factor DECIMAL(10,6) NOT NULL CHECK (conversion_factor >= 0),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE,
    CONSTRAINT unique_ingredient_unit UNIQUE (ingredient_id, unit_name)
);

-- User Prices: Tracks user-specific ingredient prices with purchase details and status flags.
-- Columns: user_price_id, user_id, ingredient_id, custom_price, quantity, base_unit, place, purchase_date, is_active, end_date, created_at.
-- Constraints: PRIMARY KEY (user_price_id), FOREIGN KEY (ingredient_id), CHECK (custom_price > 0, quantity > 0).
CREATE TABLE user_prices (
    user_price_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    custom_price DECIMAL(10,4) NOT NULL CHECK (custom_price > 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    base_unit VARCHAR(50),
    place VARCHAR(255),
    purchase_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE
);


ALTER TABLE user_prices
ADD CONSTRAINT fk_user_prices_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE;


-- Recipes: Stores recipe metadata, including name, portion size, privacy settings, and status flags.
-- Columns: recipe_id, user_id, name, portion_size, description, privacy, is_active, end_date, created_at.
-- Constraints: PRIMARY KEY (recipe_id), UNIQUE (name, portion_size), CHECK (privacy IN ('private', 'public')).
CREATE TABLE recipes (
    recipe_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    portion_size VARCHAR(20),
    description TEXT,
    privacy VARCHAR(10) NOT NULL DEFAULT 'private' CHECK (privacy IN ('private', 'public')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_recipe_name_portion UNIQUE (name, portion_size)
);

-- 1. Add generated column
ALTER TABLE recipes
ADD COLUMN active_flag TINYINT 
GENERATED ALWAYS AS (CASE WHEN is_active = 1 THEN 1 ELSE NULL END) STORED;

-- 2. Drop old unique constraint/index if exists
ALTER TABLE recipes DROP INDEX unique_recipe_name_portion;

-- 3. Add new unique constraint
ALTER TABLE recipes
ADD CONSTRAINT unique_recipe_name_portion 
UNIQUE (name, portion_size, user_id, active_flag);

-- Recipe Ingredients: Links recipes to ingredients with quantities tailored to portion size and status flags.
-- Columns: recipe_ingredient_id, recipe_id, ingredient_id, quantity, unit_name, is_active, end_date, created_at.
-- Constraints: PRIMARY KEY (recipe_ingredient_id), FOREIGN KEY (recipe_id, ingredient_id), UNIQUE (recipe_id, ingredient_id, unit_name), CHECK (quantity > 0).
CREATE TABLE recipe_ingredients (
    recipe_ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE,
    CONSTRAINT unique_recipe_ingredient_unit UNIQUE (recipe_id, ingredient_id, unit_name)
);

-- Alter Recipe Ingredients: Replace unit_name with unit_id
ALTER TABLE recipe_ingredients
    DROP CONSTRAINT unique_recipe_ingredient_unit,
    DROP COLUMN unit_name,
    ADD COLUMN unit_id INT NOT NULL,
    ADD FOREIGN KEY (unit_id) REFERENCES units (unit_id) ON DELETE RESTRICT,
    ADD CONSTRAINT unique_recipe_ingredient_unit UNIQUE (recipe_id, ingredient_id, unit_id);

-- Recipe Procedures: Stores ordered preparation steps for each recipe with status flags.
-- Columns: procedure_id, recipe_id, step_text, step_order, estimated_time, is_active, end_date, created_at.
-- Constraints: PRIMARY KEY (procedure_id), FOREIGN KEY (recipe_id), UNIQUE (recipe_id, step_order), CHECK (step_order > 0, estimated_time >= 0).
CREATE TABLE recipe_procedures (
    procedure_id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    step_text TEXT NOT NULL,
    step_order INT NOT NULL CHECK (step_order > 0),
    estimated_time INT CHECK (estimated_time >= 0),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
    CONSTRAINT unique_recipe_step_order UNIQUE (recipe_id, step_order)
);

-- Dishes: Tracks specific preparations of recipes with dates, costs, and status flags.
-- Columns: dish_id, user_id, recipe_id, preparation_date, total_cost, is_active, end_date, created_at.
-- Constraints: PRIMARY KEY (dish_id), FOREIGN KEY (recipe_id), CHECK (total_cost > 0).
CREATE TABLE dishes (
    dish_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    preparation_date DATE NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL CHECK (total_cost > 0),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE
);

-- Dish Ingredients: Stores a static snapshot of ingredients, quantities, units, and prices used for a dish.
-- Columns: dish_ingredient_id, dish_id, ingredient_id, quantity, unit_name, unit_price, total_ingredient_cost, source.
-- Constraints: PRIMARY KEY (dish_ingredient_id), FOREIGN KEY (dish_id, ingredient_id), UNIQUE (dish_id, ingredient_id, unit_name), CHECK (quantity > 0, unit_price >= 0, total_ingredient_cost >= 0, source IN ('user_price', 'default_price')).
CREATE TABLE dish_ingredients (
    dish_ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    dish_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit_name VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_ingredient_cost DECIMAL(10,6) NOT NULL CHECK (total_ingredient_cost >= 0),
    source VARCHAR(20) NOT NULL CHECK (source IN ('user_price', 'default_price')),
    base_unit VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,4) NOT NULL CHECK (base_price >= 0),
    FOREIGN KEY (dish_id) REFERENCES dishes (dish_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE RESTRICT,
    CONSTRAINT unique_dish_ingredient_unit UNIQUE (dish_id, ingredient_id, unit_name)
);

-- Alter Dish Ingredients: Replace unit_name with unit_id (NOT SURE YET)
ALTER TABLE dish_ingredients
    DROP CONSTRAINT unique_dish_ingredient_unit,
    DROP COLUMN unit_name,
    ADD COLUMN unit_id INT NOT NULL,
    ADD FOREIGN KEY (unit_id) REFERENCES units (unit_id) ON DELETE RESTRICT,
    ADD CONSTRAINT unique_dish_ingredient_unit UNIQUE (dish_id, ingredient_id, unit_id);