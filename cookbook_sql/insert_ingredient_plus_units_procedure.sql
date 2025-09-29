DELIMITER //
-- CURRENTLY its only for admin to use this procedure
-- the following procedure accepts new ingredient name, ref quantity, ref unit, default price, cup weight and its unit and notes
-- and it will convert the ref unit to kg or l and corresponding price for 1 unit of quantity to be stored in db. for eg: 500 gm of salt at £1 
-- will be converted to 1 kg and the corresponding price will be £2 and stored in db for simplicity AND also if the weight of 1 cup is given then
-- conversion factor will be calculated for 1 tsp, 1 tbsp and 1 cup 
-- similarly for unit litre it will convert for 1 litre base unit and price will be calculated and stored AND if weight of 1 cup is given then per gm or kg 
-- conversion factor for price can be calculated
-- TABLES affected -- ingredients AND units
CREATE PROCEDURE insert_ingredient_plus_units (
    IN p_name VARCHAR(30),
    IN p_reference_quantity DECIMAL(10,4),
    IN p_reference_unit VARCHAR(10),
    IN p_default_price DECIMAL(10,4),
    IN p_cup_equivalent_weight DECIMAL(10,4),
    IN p_cup_equivalent_unit VARCHAR(10),
    IN p_notes VARCHAR(100),
    IN p_user_id INT,
    IN p_role VARCHAR(10)
)
main_block: BEGIN
    DECLARE v_reference_unit VARCHAR(10);
    DECLARE v_reference_quantity DECIMAL(12,6);
    DECLARE v_default_price DECIMAL(12,6);
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
    IF p_reference_quantity IS NULL OR p_reference_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid reference quantity. Must be a number and > 0';
    END IF;

    SET v_reference_quantity = 1;
    SET v_default_price = p_default_price / p_reference_quantity;
    SET v_reference_unit = p_reference_unit;

    -- Validate default price
    IF p_default_price IS NULL OR p_default_price <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid default price. Must be a number and > 0';
    END IF;

    -- Handle weight units
    IF p_reference_unit = 'kg' THEN
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'g' THEN
        SET v_default_price = v_default_price * 1000;
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'oz' THEN
        SET v_default_price = v_default_price * 35.274;
        SET v_reference_unit = 'kg';

    ELSEIF p_reference_unit = 'lbs' THEN
        SET v_default_price = v_default_price * 2.20462;
        SET v_reference_unit = 'kg';

    -- Handle volume units
    ELSEIF p_reference_unit = 'l' THEN
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'ml' THEN
        SET v_default_price = v_default_price * 1000;
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'fl.oz' THEN
        SET v_default_price = v_default_price / 0.0284131; 
        SET v_reference_unit = 'l';

    ELSEIF p_reference_unit = 'pint' THEN
        SET v_default_price = v_default_price / 0.568261; 
        SET v_reference_unit = 'l';

    -- Handle discrete units
    ELSEIF p_reference_unit IN ('pc', 'bunch') THEN
        SET v_reference_unit = p_reference_unit;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported reference unit';
    END IF;

    -- Validate if ingredient name is already present
    SELECT COUNT(*) INTO v_exists FROM ingredients WHERE name =  p_name;
    IF v_exists > 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Name already exists in db. Cant have duplicate';  
    END IF;

    -- insert ingredient data in ingredients table 
    INSERT INTO ingredients (name, base_unit, default_price, is_active, approval_status, approved_by, approval_date, notes)
    VALUES(p_name, v_reference_unit, v_default_price, 1, 'approved', NULL, CURRENT_TIMESTAMP, p_notes);

    -- fetching ingredient id of recently add ingredient. To be used in units table
    SET v_ingredient_id = LAST_INSERT_ID();

    -- when reference unit is kg
    IF v_reference_unit = 'kg' THEN
        -- insert into table units for kg
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (v_ingredient_id, 'kg', 1.000000, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'g', 0.001000, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'oz', 0.02835, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'lbs', 0.453592, CURRENT_TIMESTAMP);

    ELSEIF v_reference_unit = 'l' THEN
        -- insert into table units for l
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (v_ingredient_id, 'l', 1.000000, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'ml', 0.001000, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'tsp', 0.005, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'tbsp', 0.015, CURRENT_TIMESTAMP),
            (v_ingredient_id, 'cup', 0.240, CURRENT_TIMESTAMP);

    ELSEIF v_reference_unit = 'pc' THEN
        -- insert into table units for pc
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (v_ingredient_id, 'pc', 1.000000, CURRENT_TIMESTAMP);
    
    ELSEIF v_reference_unit = 'bunch' THEN
        -- insert into table units for bunch
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
        VALUES
            (v_ingredient_id, 'bunch', 1.000000, CURRENT_TIMESTAMP);
    END IF;

    -- check that both cup fields are either filled (weight > 0 + unit) 
    -- or both empty (NULL/0 + NULL/empty string), and disallow negatives
    IF ((p_cup_equivalent_weight > 0 AND (p_cup_equivalent_unit IS NULL OR p_cup_equivalent_unit = ''))
        OR ((p_cup_equivalent_weight IS NULL OR p_cup_equivalent_weight = 0) AND (p_cup_equivalent_unit IS NOT NULL AND p_cup_equivalent_unit <> ''))
        OR (p_cup_equivalent_weight < 0)) THEN
        SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Cup weight and unit must both be filled (weight > 0 + unit), or both empty (0/NULL + empty unit)';
    END IF;

    -- check if cup weight and unit if given is valid or not
    IF (p_cup_equivalent_weight IS NOT NULL AND p_cup_equivalent_weight > 0
    AND p_cup_equivalent_unit IS NOT NULL AND p_cup_equivalent_unit <> '') THEN

         -- Validate cup weight
        IF p_cup_equivalent_weight IS NULL OR p_cup_equivalent_weight <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cup equivalent weight. Must be a number and > 0';
        END IF;
        -- validate cup unit
        IF p_cup_equivalent_unit NOT IN ('kg', 'g', 'oz', 'lbs') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid cup equivalent unit. Must be IN (kg, g, oz, lbs)';
        END IF;

        -- IF reference unit in kg
        IF v_reference_unit = 'kg' THEN
            -- convert cup unit to kg if other than gm selected like gm, oz, lbs
            IF p_cup_equivalent_unit = 'g' THEN
                SET v_cup_weight = p_cup_equivalent_weight/1000;
            ELSEIF p_cup_equivalent_unit = 'oz' THEN 
                SET v_cup_weight = p_cup_equivalent_weight * 0.0283495;
            ELSEIF p_cup_equivalent_unit = 'lbs' THEN 
                SET v_cup_weight = p_cup_equivalent_weight * 0.453592;
            ELSEIF p_cup_equivalent_unit = 'kg' THEN 
                SET v_cup_weight = p_cup_equivalent_weight;
            END IF;
        
            SET v_tbsp_weight = ROUND(v_cup_weight/16,6);
            SET v_tsp_weight = ROUND(v_tbsp_weight/3,6);
            SET v_per_ml_weight = ROUND(v_cup_weight/240,6);
            SET v_litre_weight = ROUND(v_per_ml_weight * 1000,6);
            -- insert into table units for kg and g
            INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
            VALUES
                (v_ingredient_id, 'cup', v_cup_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'tbsp', v_tbsp_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'tsp', v_tsp_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'ml', v_per_ml_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'l', v_litre_weight, CURRENT_TIMESTAMP);

        -- IF reference unit in litre       
        ELSEIF v_reference_unit = 'l' THEN
            -- convert cup unit to kg if other than gm selected like gm, oz, lbs
            IF p_cup_equivalent_unit = 'g' THEN
                SET v_cup_weight = p_cup_equivalent_weight/1000;
            ELSEIF p_cup_equivalent_unit = 'oz' THEN 
                SET v_cup_weight = p_cup_equivalent_weight * 0.0283495;
            ELSEIF p_cup_equivalent_unit = 'lbs' THEN 
                SET v_cup_weight = p_cup_equivalent_weight * 0.453592;
            ELSEIF p_cup_equivalent_unit = 'kg' THEN 
                SET v_cup_weight = p_cup_equivalent_weight;
            END IF;
        
            SET v_kg_weight = ROUND(1000 * v_cup_weight/240,6);
            SET v_gm_weight = ROUND(v_kg_weight / 1000,6);
            -- insert into table units for kg and g
            INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
            VALUES
                (v_ingredient_id, 'kg', v_kg_weight, CURRENT_TIMESTAMP),
                (v_ingredient_id, 'g', v_gm_weight, CURRENT_TIMESTAMP);
        END IF;   
    END IF;
END //
DELIMITER ;