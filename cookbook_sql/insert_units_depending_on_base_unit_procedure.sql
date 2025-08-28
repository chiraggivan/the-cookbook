DELIMITER //
CREATE PROCEDURE insert_units_depending_on_base_unit (
    IN p_ingredient_id INT,
    IN p_weight_quantity DECIMAL(10,6),
    IN p_weight_unit VARCHAR(50),
    IN p_weighing_instrument VARCHAR(50),
    IN p_user_id INT
)
main_block: BEGIN
    DECLARE v_base_unit VARCHAR(50);
    DECLARE v_weight_quantity FLOAT(10,6);
    DECLARE v_rows INT;

    SELECT base_unit
    INTO v_base_unit
    FROM ingredients
    WHERE ingredient_id = p_ingredient_id;

    -- check if ingredient exists in table
     IF v_base_unit IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid ingredient from db';
    END IF;

    -- Only proceed if base_unit is 'kg'
    IF v_base_unit != 'kg' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Base unit not in kg. Sort it first.';
    END IF;

    -- Check if unit is kg or g and proceed accordingly 
    IF v_base_unit IN ('kg') THEN 
        
        -- insert into table units for kg and g
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (p_ingredient_id, 'kg', 1.000000, CURRENT_TIMESTAMP),
            (p_ingredient_id, 'g', 0.001000, CURRENT_TIMESTAMP),
            (p_ingredient_id, 'oz', 0.02835, CURRENT_TIMESTAMP),
            (p_ingredient_id, 'lbs', 0.453592, CURRENT_TIMESTAMP);
        
        -- check the remain fields if any one null then return
        IF p_weight_quantity IS NULL OR p_weight_quantity <= 0 OR p_weight_unit IS NULL OR p_weighing_instrument IS NULL THEN
            LEAVE main_block;
        END IF;

        -- check if weighing instrument is cup, tbsp or tsp or weight is less 0, if yes the return
        IF p_weighing_instrument NOT IN ('cup', 'tbsp', 'tsp') OR  p_weight_quantity <= 0 THEN
            LEAVE main_block;
        END IF;

        -- check if weight unit is kg or g
        IF p_weight_unit NOT IN ('kg','g') THEN 
            LEAVE main_block;
        END IF;
        -- convert quantity for gm in quantity for kg
        IF p_weight_unit = 'g' THEN 
            SET v_weight_quantity = p_weight_quantity/1000;
        END IF; 

        -- insert in to units table.
        SELECT COUNT(*)
        INTO v_rows
        FROM units
        WHERE ingredient_id = p_ingredient_id AND unit_name = p_weighing_instrument;

        IF v_rows != 0 THEN 
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Units already available for the ingredients.';
        END IF;

        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES(p_ingredient_id, p_weighing_instrument, v_weight_quantity, CURRENT_TIMESTAMP);

        -- If tsp is inserted, add tbsp, cup if they don't exist
        IF p_weighing_instrument = 'tsp' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tbsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'tbsp', v_weight_quantity * 3, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'cup') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'cup', v_weight_quantity * 48, CURRENT_TIMESTAMP);
            END IF;
        -- If tbsp is inserted, add tsp, cup if they don't exist
        ELSEIF p_weighing_instrument = 'tbsp' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'tsp', v_weight_quantity / 3, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'cup') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'cup', v_weight_quantity * 16, CURRENT_TIMESTAMP);
            END IF;
        -- If cup is inserted, add tsp, tbsp, and oz if they don't exist
        ELSEIF p_weighing_instrument = 'cup' THEN
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'tsp', v_weight_quantity / 48, CURRENT_TIMESTAMP);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM units WHERE ingredient_id = p_ingredient_id AND unit_name = 'tbsp') THEN
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (p_ingredient_id, 'tbsp', v_weight_quantity / 16, CURRENT_TIMESTAMP);
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;