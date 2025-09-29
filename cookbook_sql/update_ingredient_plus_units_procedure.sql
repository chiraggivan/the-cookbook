DELIMITER //
-- CURRENTLY its only for admin to use this procedure
-- the following procedure accepts ingredient_id, name, ref quantity, ref unit, default price, cup weight and its unit and notes
-- and it will convert the ref unit to kg or l and corresponding price for 1 unit of quantity to be UPDATED in db. for eg: 500 gm of salt at £1 
-- will be converted to 1 kg and the corresponding price will be £2 and stored in db for simplicity AND also if the weight of 1 cup is given then
-- conversion factor will be calculated for 1 tsp, 1 tbsp and 1 cup 
-- similarly for unit litre it will convert for 1 litre base unit and price will be calculated and stored AND if weight of 1 cup is given then per gm or kg 
-- conversion factor for price can be calculated
-- TABLES affected -- ingredients AND units
CREATE PROCEDURE update_ingredient_plus_units (
    IN p_ingredient_id INT,
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
    DECLARE v_old_name VARCHAR(30);
    DECLARE v_old_base_unit VARCHAR(10);
    DECLARE v_old_default_price DECIMAL(12,6);
    DECLARE v_old_notes VARCHAR(100);
    DECLARE v_msg TEXT;
    DECLARE v_temp_unit_id INT;

    -- validate ingredient id
    IF p_ingredient_id IS NULL OR p_ingredient_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid ingredient id. Must be a number and > 0';
    END IF;

    -- validate ingredient name
    IF p_name IS NULL OR p_name = "" THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid ingredient name. Must be a String and not empty';
    END IF;

    -- validate reference quantity
    IF p_reference_quantity IS NULL OR p_reference_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid reference quantity. Must be a number and > 0';
    END IF;

    -- Validate default price
    IF p_default_price IS NULL OR p_default_price <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid default price. Must be a number and > 0';
    END IF;

    SET v_reference_quantity = 1;
    SET v_default_price = p_default_price / p_reference_quantity;
    SET v_reference_unit = p_reference_unit;
    -- validate and Handle weight units
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

    SET v_ingredient_id = p_ingredient_id;

    -- check that both cup fields are either filled (weight > 0 + unit) 
    -- or both empty (NULL/0 + NULL/empty string), and disallow negatives
    IF ((p_cup_equivalent_weight > 0 AND (p_cup_equivalent_unit IS NULL OR p_cup_equivalent_unit = ''))
        OR ((p_cup_equivalent_weight IS NULL OR p_cup_equivalent_weight = 0) AND (p_cup_equivalent_unit IS NOT NULL AND p_cup_equivalent_unit <> ''))
        OR (p_cup_equivalent_weight < 0)) THEN
        SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Cup weight and unit must both be filled (weight > 0 + unit), or both empty (0/NULL + empty unit)';
    END IF;

    -- Validate if ingredient id is already present
    SELECT COUNT(*) INTO v_exists FROM ingredients WHERE ingredient_id =  p_ingredient_id;
    IF v_exists = 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ingredient id does not exists in db.';  
    END IF;    

    -- Validate if ingredient name is already present
    SELECT COUNT(*) INTO v_exists FROM ingredients WHERE name =  p_name AND ingredient_id !=  p_ingredient_id;
    IF v_exists > 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Name already exists in db. Cant have duplicate';  
    END IF;

    -- compare old ingredient data with new ingredient data
    SELECT name, base_unit, default_price, notes
    INTO v_old_name, v_old_base_unit, v_old_default_price, v_old_notes
    FROM ingredients
    WHERE ingredient_id = p_ingredient_id;


    SET v_msg = CONCAT('old name: ', v_old_name,'- new name: ', p_name,
                    ' | old unit: ', v_old_base_unit, ' - new unit: ',v_reference_unit,
                    ' | old price: ', v_old_default_price,' new price: ',ROUND(v_default_price, 4));

    -- if any of the details changes for ingredient table then update
    IF (v_old_name != p_name) OR (v_old_base_unit != v_reference_unit) OR 
        (v_old_default_price != ROUND(v_default_price, 4)) OR (v_old_notes != p_notes OR (v_old_notes IS NULL) != (p_notes IS NULL)) THEN
        -- SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'There is some change in data for ingredients. Here it need to save new data in db for ingredients.' ; 

        UPDATE ingredients 
        SET name = p_name, base_unit = v_reference_unit, default_price = v_default_price, notes = p_notes
        WHERE ingredient_id = p_ingredient_id;
    -- ELSE
    --     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
    END IF;

    -- if base unit changes from kg -> l, l -> kg, kg-> pc / bunch , pc/bunch -> kg /l, etc. then update/add units table data
    IF v_old_base_unit != v_reference_unit THEN
        UPDATE units
        SET is_active = 0, end_date = CURRENT_TIMESTAMP
        WHERE ingredient_id = p_ingredient_id;

        -- when reference unit is kg
        IF v_reference_unit = 'kg' THEN
            -- update into table units for kg if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'kg';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'kg', 1.000000, CURRENT_TIMESTAMP);
            END IF;
            
            -- update into table units for g if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'g';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.001000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'g', 0.001000, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for oz if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'oz';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.02835, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'oz', 0.02835, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for lbs if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'lbs';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.453592, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'lbs', 0.453592, CURRENT_TIMESTAMP);
            END IF;
        END IF;

        -- when reference unit is l
        IF v_reference_unit = 'l' THEN
            -- update into table units for l if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'l';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'l', 1.000000, CURRENT_TIMESTAMP);
            END IF;
            
            -- update into table units for ml if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'ml';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.001000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'ml', 0.001000, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for cup if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'cup';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.240000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'cup', 0.240000, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for tbsp if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tbsp';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.015000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'tbsp', 0.015000, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for tsp if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tsp';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.005000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'tsp', 0.005000, CURRENT_TIMESTAMP);
            END IF;
        END IF;

        -- when reference unit is pc
        IF v_reference_unit = 'pc' THEN
            -- update into table units for pc if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'pc';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'pc', 1.000000, CURRENT_TIMESTAMP);
            END IF;
        END IF;

        -- when reference unit is bunch
        IF v_reference_unit = 'bunch' THEN
            -- update into table units for bunch if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'bunch';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'bunch', 1.000000, CURRENT_TIMESTAMP);
            END IF;
        END IF;
    END IF;

    -- if cup weight and unit is given then units table will have more data to update or add
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

        -- make all units of ingredients inactivate
        UPDATE units
        SET is_active = 0, end_date = CURRENT_TIMESTAMP
        WHERE ingredient_id = p_ingredient_id;

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

            -- update/insert into table units for kg
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'kg';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET  conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'kg', 1.000000, CURRENT_TIMESTAMP);
            END IF;

            -- update/insert into table units for g
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'g';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET  conversion_factor = 0.001000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'g', 0.001000, CURRENT_TIMESTAMP);
            END IF;

            -- update/insert into table units for oz
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'oz';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.0283495, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'oz', 0.0283495, CURRENT_TIMESTAMP);
            END IF;

            -- update/insert into table units for lbs
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'lbs';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.453592, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'lbs', 0.453592, CURRENT_TIMESTAMP);
            END IF;

            -- update/insert into table units for cup, tbsp, tsp, ml and l 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'cup';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = v_cup_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'cup', v_cup_weight, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for tbsp if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tbsp';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = v_tbsp_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'tbsp', v_tbsp_weight, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for tsp if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tsp';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = v_tsp_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'tsp', v_tsp_weight, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for ml if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'ml';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = v_per_ml_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'ml', v_per_ml_weight, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for l if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'l';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = v_litre_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'l', v_litre_weight, CURRENT_TIMESTAMP);
            END IF;

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

            -- update/insert into table units for l
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'l';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 1.000000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'l', 1.000000, CURRENT_TIMESTAMP);
            END IF;

            -- update/insert into table units for ml
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'ml';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.001000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'ml', 0.001000, CURRENT_TIMESTAMP);
            END IF;

            -- update/insert into table units for cup
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'cup';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.240000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'cup', 0.240000, CURRENT_TIMESTAMP);
            END IF;

            -- update/insert into table units for tbsp
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tbsp';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.015000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'tbsp', 0.015000, CURRENT_TIMESTAMP);
            END IF;

            -- update/insert into table units for tsp
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'tsp';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = 0.005000, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'tsp', 0.005000, CURRENT_TIMESTAMP);
            END IF;
            -- update/insert into table units for kg
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'kg';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = v_kg_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'kg', v_kg_weight, CURRENT_TIMESTAMP);
            END IF;

            -- update into table units for g if available 
            SELECT unit_id 
            INTO v_temp_unit_id
            FROM units 
            WHERE ingredient_id = p_ingredient_id AND is_active = 0 AND unit_name = 'g';

            IF v_temp_unit_id IS NOT NULL THEN 
                UPDATE units
                SET conversion_factor = v_gm_weight, created_at = CURRENT_TIMESTAMP, is_active = 1, end_date = NULL
                WHERE unit_id = v_temp_unit_id;
            ELSE
                INSERT INTO units (ingredient_id, unit_name, conversion_factor, created_at)
                VALUES (v_ingredient_id, 'g', v_gm_weight, CURRENT_TIMESTAMP);
            END IF;
        END IF;   
    END IF;
END //
DELIMITER ;
