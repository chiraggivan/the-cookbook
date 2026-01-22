DELIMITER //

DROP PROCEDURE IF EXISTS insert_user_ingredient_plus_units //
-- its for user's to use this procedure
-- the following procedure accepts new ingredient name,  quantity,  unit,  price, cup weight and its unit and notes
-- and it will convert the  unit to kg or l and corresponding price for 1 unit of quantity to be stored in db. for eg: 500 gm of salt at £1 
-- will be converted to 1 kg and the corresponding price will be £2 and stored in db for simplicity AND also if the weight of 1 cup is given then
-- conversion factor will be calculated for 1 tsp, 1 tbsp and 1 cup 
-- similarly for unit litre it will convert for 1 litre base unit and price will be calculated and stored AND if weight of 1 cup is given then per gm or kg 
-- conversion factor for price can be calculated
-- TABLES affected -- user_ingredients AND units
CREATE PROCEDURE insert_user_ingredient_plus_units (
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

    -- Validate if ingredient name is already present
    SELECT COUNT(*) INTO v_exists FROM ingredients WHERE name =  p_name;
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

    -- insert ingredient data in ingredients table 
    INSERT INTO user_ingredients (name, submitted_by, base_unit, base_price, display_quantity, display_unit, display_price,
                is_active, approval_status, approved_by, approval_date, notes, cup_weight, cup_unit)
    VALUES(p_name, p_user_id, v_unit, v_price, d_quantity, d_unit, d_price, 1, 'pending', NULL, NULL, p_notes, p_cup_weight, p_cup_unit);

    -- fetching ingredient id of recently add ingredient. To be used in units table
    SET v_ingredient_id = LAST_INSERT_ID();

    -- when reference unit is kg
    IF v_unit = 'kg' THEN
        -- insert into table units for kg
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
        VALUES
            (v_ingredient_id, 'kg', 1.000000, 'user'),
            (v_ingredient_id, 'g', 0.001000, 'user'),
            (v_ingredient_id, 'oz', 0.02835, 'user'),
            (v_ingredient_id, 'lbs', 0.453592, 'user');

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
            (v_ingredient_id, 'pint', 0.568261, 'user'); 

    ELSEIF v_unit = 'pc' THEN
        -- insert into table units for pc
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
        VALUES
            (v_ingredient_id, 'pc', 1.000000, 'user');
    
    ELSEIF v_unit = 'bunch' THEN
        -- insert into table units for bunch
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, ingredient_source)
        VALUES
            (v_ingredient_id, 'bunch', 1.000000, 'user');
    END IF;

    -- check if cup weight and unit if given is valid or not
    IF (p_cup_weight IS NOT NULL AND p_cup_weight > 0
    AND p_cup_unit IS NOT NULL AND p_cup_unit <> '') THEN

         -- Validate cup weight
        IF p_cup_weight IS NULL OR p_cup_weight <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cup equivalent weight. Must be a number and > 0';
        END IF;
        -- validate cup unit
        IF p_cup_unit NOT IN ('kg', 'g', 'oz', 'lbs') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cup equivalent unit. Must be IN (kg, g, oz, lbs)';
        END IF;

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
                (v_ingredient_id, 'l', v_litre_weight, 'user');

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
                (v_ingredient_id, 'g', v_gm_weight, 'user');
        END IF;   
    END IF;
END //
DELIMITER ;