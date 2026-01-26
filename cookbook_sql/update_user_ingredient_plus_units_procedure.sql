DELIMITER //

DROP PROCEDURE IF EXISTS update_user_ingredient_plus_units //
-- its for user's to use this procedure
-- the following procedure accepts new ingredient name,  quantity,  unit,  price, cup weight and its unit and notes
-- and it will convert the  unit to kg or l and corresponding price for 1 unit of quantity to be stored in db. for eg: 500 gm of salt at £1 
-- will be converted to 1 kg and the corresponding price will be £2 and stored in db for simplicity AND also if the weight of 1 cup is given then
-- conversion factor will be calculated for 1 tsp, 1 tbsp and 1 cup 
-- similarly for unit litre it will convert for 1 litre base unit and price will be calculated and stored AND if weight of 1 cup is given then per gm or kg 
-- conversion factor for price can be calculated
-- TABLES affected -- user_ingredients AND units
CREATE PROCEDURE update_user_ingredient_plus_units (
    IN p_ingredient_id INT,
    IN p_name VARCHAR(30),
    IN p_quantity DECIMAL(10,4),
    IN p_unit VARCHAR(10),
    IN p_price DECIMAL(10,4),
    IN p_cup_weight DECIMAL(10,4),
    IN p_cup_unit VARCHAR(10),
    IN p_notes VARCHAR(100),
    IN p_user_id INT
)
main_block: BEGIN
    DECLARE v_unit VARCHAR(10);
    DECLARE d_unit VARCHAR(10);
    DECLARE v_quantity DECIMAL(12,6);
    DECLARE d_quantity DECIMAL(12,6);
    DECLARE v_price DECIMAL(12,6);
    DECLARE d_price DECIMAL(12,6);
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_cup_weight DECIMAL(12,6);
    DECLARE v_tbsp_weight DECIMAL(12,6);
    DECLARE v_tsp_weight DECIMAL(12,6);
    DECLARE v_per_ml_weight DECIMAL(12,6);
    DECLARE v_litre_weight DECIMAL(12,6);
    DECLARE v_kg_weight DECIMAL(12,6);
    DECLARE v_gm_weight DECIMAL(12,6);
    DECLARE v_ingredient_id INT;

     -- Normalize quantity to 1
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid reference quantity. Must be a number and > 0';
    END IF;

    -- Validate default price
    IF p_price IS NULL OR p_price <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid default price. Must be a number and > 0';
    END IF;
    
    SET d_quantity = p_quantity; -- for display quantity
    SET d_unit = p_unit; -- for display unit 
    SET d_price = p_price; -- for display price
    SET v_quantity = 1;
    SET v_price = p_price / p_quantity;
    SET v_unit = p_unit;

    

    -- Handle weight units
    IF p_unit = 'kg' THEN
        SET v_unit = 'kg';

    ELSEIF p_unit = 'g' THEN
        SET v_price = v_price * 1000;
        SET v_unit = 'kg';

    ELSEIF p_unit = 'oz' THEN
        SET v_price = v_price * 35.274;
        SET v_unit = 'kg';

    ELSEIF p_unit = 'lbs' THEN
        SET v_price = v_price * 2.20462;
        SET v_unit = 'kg';

    -- Handle volume units
    ELSEIF p_unit = 'l' THEN
        SET v_unit = 'l';

    ELSEIF p_unit = 'ml' THEN
        SET v_price = v_price * 1000;
        SET v_unit = 'l';

    ELSEIF p_unit = 'fl.oz' THEN
        SET v_price = v_price / 0.0284131; 
        SET v_unit = 'l';

    ELSEIF p_unit = 'pint' THEN
        SET v_price = v_price / 0.568261; 
        SET v_unit = 'l';

    -- Handle discrete units
    ELSEIF p_unit IN ('pc', 'bunch') THEN
        SET v_unit = p_unit;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported reference unit';
    END IF;

    -- Validate if user  is rightful owner of the ingredientin user ingredients table
    SELECT COUNT(*) INTO v_exists FROM user_ingredients WHERE user_ingredient_id = p_ingredient_id AND submitted_by = p_user_id AND is_active = 1  ;
    IF v_exists > 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Name already exists in db. Cant have duplicate';  
    END IF;

    -- Validate if ingredient name is already present in main ingredients table
    SELECT COUNT(*) INTO v_exists FROM ingredients WHERE name =  p_name;
    IF v_exists > 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Name already exists in db. Cant have duplicate';  
    END IF;

    -- Validate if ingredient name is already present in user_ingredient table
    SELECT COUNT(*) INTO v_exists FROM user_ingredients WHERE name =  p_name and user_ingredient_id != p_ingredient_id;
    IF v_exists > 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Name already exists in db. Cant have duplicate';  
    END IF;

    -- check that both cup fields are either filled (weight > 0 + unit) 
    -- or both empty (NULL/0 + NULL/empty string), and disallow negatives
    IF ((p_cup_weight > 0 AND (p_cup_unit IS NULL OR p_cup_unit = ''))
        OR ((p_cup_weight IS NULL OR p_cup_weight = 0) AND (p_cup_unit IS NOT NULL AND p_cup_unit <> ''))
        OR (p_cup_weight < 0)) THEN
        SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Cup weight and unit must both be filled (weight > 0 + unit), or both empty (0/NULL + empty unit)';
    END IF;
    -- -------------------------------------------- create temp tables --------------------------------------------------------------------
    CREATE TEMPORARY TABLE tmp_units_before (
        unit_id INT PRIMARY KEY
    );

    CREATE TEMPORARY TABLE tmp_recipe_ingredients_before (
        recipe_ingredient_id INT PRIMARY KEY,
        unit_id INT,
        was_active TINYINT(1)
    );

    INSERT INTO tmp_units_before (unit_id)
    SELECT unit_id
    FROM units
    WHERE ingredient_id = p_ingredient_id AND ingredient_source = 'user' AND is_active = 1;

    -- INSERT INTO tmp_recipe_ingredients_before (recipe_ingredient_id, unit_id, was_active)
    -- SELECT  ri.recipe_ingredient_id, ri.unit_id, ri.is_active
    -- FROM recipe_ingredients ri
    -- JOIN tmp_units_before t ON ri.unit_id = t.unit_id;

    -- ---------------------------------------------------Deactivate units  rows --------------------------------------

    -- deactivate units
    UPDATE units
    SET is_active = 0,
        end_date = CURRENT_TIMESTAMP
    WHERE ingredient_id = p_ingredient_id AND ingredient_source = 'user'; 

    -- ----------------------------------------------------UPDATE / INSERT Begins----------------------------------------------------------
    -- update ingredient data in user_ingredients table 
    UPDATE user_ingredients
    SET name = p_name, base_unit = v_unit, base_price = v_price, display_quantity = d_quantity, display_unit = d_unit, display_price = d_price,
        notes = p_notes, cup_weight = p_cup_weight, cup_unit = p_cup_unit
    WHERE user_ingredient_id = p_ingredient_id;

    SET v_ingredient_id = p_ingredient_id;
    -- when reference unit is kg
    IF v_unit = 'kg' THEN

        -- insert/ update if duplicate - into table units for kg
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
        VALUES
            (v_ingredient_id, 'kg', 1.000000, 'user'),
            (v_ingredient_id, 'g', 0.001000, 'user'),
            (v_ingredient_id, 'oz', 0.02835, 'user'),
            (v_ingredient_id, 'lbs', 0.453592, 'user')
            ON DUPLICATE KEY UPDATE
            is_active = 1,
            end_date = NULL;

    ELSEIF v_unit = 'l' THEN
        -- insert into table units for l
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
        VALUES
            (v_ingredient_id, 'l', 1.000000, 'user'),
            (v_ingredient_id, 'ml', 0.001000, 'user'),
            (v_ingredient_id, 'tsp', 0.005, 'user'),
            (v_ingredient_id, 'tbsp', 0.015, 'user'),
            (v_ingredient_id, 'fl.oz', 0.0284131, 'user'),
            (v_ingredient_id, 'cup', 0.240, 'user'),
            (v_ingredient_id, 'pint', 0.568261, 'user')
            ON DUPLICATE KEY UPDATE
            is_active = 1,
            end_date = NULL; 

    ELSEIF v_unit = 'pc' THEN
        -- insert into table units for pc
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
        VALUES
            (v_ingredient_id, 'pc', 1.000000, 'user')
            ON DUPLICATE KEY UPDATE
            is_active = 1,
            end_date = NULL;
    
    ELSEIF v_unit = 'bunch' THEN
        -- insert into table units for bunch
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
        VALUES
            (v_ingredient_id, 'bunch', 1.000000, 'user')
            ON DUPLICATE KEY UPDATE
            is_active = 1,
            end_date = NULL;
    END IF;

    -- check if cup weight and unit if given is valid or not
    IF (p_cup_weight IS NOT NULL AND p_cup_weight > 0
    AND p_cup_unit IS NOT NULL AND p_cup_unit <> '') THEN


        -- IF reference unit in kg
        IF v_unit = 'kg' THEN
            -- convert cup unit to kg if other than gm selected like gm, oz, lbs
            IF p_cup_unit = 'g' THEN
                SET v_cup_weight = p_cup_weight/1000;
            ELSEIF p_cup_unit = 'oz' THEN 
                SET v_cup_weight = p_cup_weight * 0.0283495;
            ELSEIF p_cup_unit = 'lbs' THEN 
                SET v_cup_weight = p_cup_weight * 0.453592;
            ELSEIF p_cup_unit = 'kg' THEN 
                SET v_cup_weight = p_cup_weight;
            END IF;
        
            SET v_tbsp_weight = ROUND(v_cup_weight/16,6);
            SET v_tsp_weight = ROUND(v_tbsp_weight/3,6);
            SET v_per_ml_weight = ROUND(v_cup_weight/240,6);
            SET v_litre_weight = ROUND(v_per_ml_weight * 1000,6);
            -- insert into table units for kg and g
            INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
            VALUES
                (v_ingredient_id, 'cup', v_cup_weight, 'user'),
                (v_ingredient_id, 'tbsp', v_tbsp_weight, 'user'),
                (v_ingredient_id, 'tsp', v_tsp_weight, 'user'),
                (v_ingredient_id, 'ml', v_per_ml_weight, 'user'),
                (v_ingredient_id, 'l', v_litre_weight, 'user')
                ON DUPLICATE KEY UPDATE
                is_active = 1,
                end_date = NULL;

        -- IF reference unit in litre       
        ELSEIF v_unit = 'l' THEN
            -- convert cup unit to kg if other than gm selected like gm, oz, lbs
            IF p_cup_unit = 'g' THEN
                SET v_cup_weight = p_cup_weight/1000;
            ELSEIF p_cup_unit = 'oz' THEN 
                SET v_cup_weight = p_cup_weight * 0.0283495;
            ELSEIF p_cup_unit = 'lbs' THEN 
                SET v_cup_weight = p_cup_weight * 0.453592;
            ELSEIF p_cup_unit = 'kg' THEN 
                SET v_cup_weight = p_cup_weight;
            END IF;
        
            SET v_kg_weight = ROUND(1000 * v_cup_weight/240,6);
            SET v_gm_weight = ROUND(v_kg_weight / 1000,6);
            -- insert into table units for kg and g
            INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
            VALUES
                (v_ingredient_id, 'kg', v_kg_weight, 'user'),
                (v_ingredient_id, 'g', v_gm_weight, 'user') AS new
                ON DUPLICATE KEY UPDATE
                conversion_factor = new.conversion_factor,
                is_active = 1,
                end_date = NULL;
        END IF;   
    END IF;

    -- ------------------------------------------------ fetch the active units again ----------------------------------------------------

    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_units_after (
        unit_id INT PRIMARY KEY
    );

    INSERT INTO tmp_units_after (unit_id)
    SELECT u.unit_id
    FROM units u
    WHERE u.ingredient_id = p_ingredient_id AND u.ingredient_source = 'user' AND u.is_active = 1;

    -- Deactivate recipe_ingredient rows for which unit_id not found in temp_after but present in temp_before
    UPDATE recipe_ingredient ri
    JOIN (
        SELECT b.unit_id
        FROM tmp_units_before b
        LEFT JOIN tmp_units_after a ON a.unit_id = b.unit_id
        WHERE a.unit_id IS NULL
    ) AS units_to_deactivate
    ON ri.unit_id = units_to_deactivate.unit_id
    SET
        ri.is_active = 0,
        ri.end_date = CURRENT_TIMESTAMP;
    
    DROP TEMPORARY TABLE IF EXISTS tmp_units_before;
    DROP TEMPORARY TABLE IF EXISTS tmp_units_after;

END //
DELIMITER ;

-- we reactivate only if all parents are active.
    -- UPDATE recipe_ingredient ri
    -- JOIN (
    --     SELECT a.unit_id
    --     FROM tmp_units_after a
    --     LEFT JOIN tmp_units_before b ON b.unit_id = a.unit_id
    --     WHERE b.unit_id IS NULL
    -- ) AS units_to_activate
    --     ON ri.unit_id = units_to_activate.unit_id
    -- JOIN recipes r ON r.recipe_id = ri.recipe_id AND r.is_active = 1
    -- JOIN user_ingredients ui ON ui.user_ingredient_id = ri.ingredient_id AND ui.is_active = 1
    -- JOIN units u ON u.unit_id = ri.unit_id AND u.is_active = 1
    -- SET
    --     ri.is_active = 1,
    --     ri.end_date = NULL;