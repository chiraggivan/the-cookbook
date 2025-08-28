DELIMITER //
CREATE PROCEDURE insert_unit_with_related (
    IN p_ingredient_id INT,
    IN p_unit_name VARCHAR(50),
    IN p_conversion_factor DECIMAL(10,6),
    IN p_is_active BOOLEAN
)
BEGIN
    DECLARE base_unit VARCHAR(50);
    
    -- Get the base_unit of the ingredient
    SELECT i.base_unit INTO base_unit
    FROM ingredients i
    WHERE i.ingredient_id = p_ingredient_id;
    
    -- Insert the primary unit
    INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
    VALUES (p_ingredient_id, p_unit_name, p_conversion_factor, p_is_active, CURRENT_TIMESTAMP);
    
    -- Only proceed if base_unit is 'kg' and unit_name is tsp, tbsp, cup, or oz
    IF base_unit = 'kg' AND p_unit_name IN ('tsp', 'tbsp', 'cup') THEN
        -- If tsp is inserted, add tbsp, cup, and oz if they don't exist
        IF p_unit_name = 'tsp' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tbsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'tbsp', p_conversion_factor * 3, p_is_active, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'cup') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'cup', p_conversion_factor * 48, p_is_active, CURRENT_TIMESTAMP);
            END IF;
        -- If tbsp is inserted, add tsp, cup, and oz if they don't exist
        ELSEIF p_unit_name = 'tbsp' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'tsp', p_conversion_factor / 3, p_is_active, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'cup') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'cup', p_conversion_factor * 16, p_is_active, CURRENT_TIMESTAMP);
            END IF;
        -- If cup is inserted, add tsp, tbsp, and oz if they don't exist
        ELSEIF p_unit_name = 'cup' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'tsp', p_conversion_factor / 48, p_is_active, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tbsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
                VALUES (p_ingredient_id, 'tbsp', p_conversion_factor / 16, p_is_active, CURRENT_TIMESTAMP);
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;