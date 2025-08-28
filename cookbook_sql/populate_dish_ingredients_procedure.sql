DELIMITER //
CREATE PROCEDURE populate_dish_ingredients (
    IN p_dish_id INT,
    IN p_recipe_id INT,
    IN p_source VARCHAR(20)
)
BEGIN
    DECLARE v_dish_exists INT;
    
    -- Validate source
    IF p_source NOT IN ('user_price', 'default_price') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid source: must be user_price or default_price';
    END IF;
    
    -- Validate dish_id
    SELECT COUNT(*) INTO v_dish_exists
    FROM dishes
    WHERE dish_id = p_dish_id;
    
    IF v_dish_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Dish ID not found';
    END IF;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Insert into Dish Ingredients
    INSERT INTO dish_ingredients (
        dish_id,
        ingredient_id,
        quantity,
        unit_name,
        unit_price,
        total_ingredient_cost,
        source,
        base_unit,
        base_price
    )
    SELECT
        p_dish_id,
        i.ingredient_id,
        ri.quantity,
        u.unit_name,
        ROUND(i.default_price * u.conversion_factor, 2),
        ri.quantity * i.default_price * u.conversion_factor,
        p_source,
        i.base_unit,
        i.default_price
    FROM ingredients i
    JOIN recipe_ingredients ri ON i.ingredient_id = ri.ingredient_id
    JOIN units u ON ri.unit_id = u.unit_id
    JOIN recipes r ON ri.recipe_id = r.recipe_id
    JOIN users us ON r.user_id = us.user_id
    WHERE r.recipe_id = p_recipe_id
    AND ri.is_active = TRUE;
    
    -- Commit transaction
    COMMIT;
END //
DELIMITER ;