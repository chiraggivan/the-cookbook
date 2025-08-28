DELIMITER //

CREATE PROCEDURE update_insert_user_price (
    IN p_user_id INT,
    IN p_ingredient_id INT,
    IN p_price DECIMAL(10,4),
    IN p_quantity INT,
    IN p_base_unit VARCHAR(50),
    IN p_place VARCHAR(255)
)
BEGIN
    DECLARE v_ing_count INT;
    DECLARE v_user_exists INT;
    DECLARE v_ingredient_exists INT;
    DECLARE v_old_prices INT;
    
    -- Validate inputs
    IF p_price <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Price must be greater than 0';
    END IF;
    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quantity must be greater than 0';
    END IF;
    
    -- Validate foreign keys
    SELECT COUNT(*) 
    INTO v_user_exists 
    FROM users 
    WHERE user_id = p_user_id;
    IF v_user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid user_id';
    END IF;
    
    SELECT COUNT(*) INTO v_ingredient_exists FROM ingredients WHERE ingredient_id = p_ingredient_id;
    IF v_ingredient_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid ingredient_id';
    END IF;
    
    -- Check for existing active price
    SELECT COUNT(*) 
    INTO v_ing_count
    FROM user_prices
    WHERE user_id = p_user_id
    AND ingredient_id = p_ingredient_id
    AND is_active = TRUE;
    
    -- START TRANSACTION;
    
        -- Deactivate existing active price
        IF v_ing_count > 0 THEN
            UPDATE user_prices
            SET is_active = FALSE,
                end_date = CURRENT_DATE
            WHERE user_id = p_user_id
            AND ingredient_id = p_ingredient_id
            AND is_active = 1;
        END IF;
        
        SELECT COUNT(*) INTO v_old_prices FROM user_prices 
        WHERE user_id = p_user_id
        AND ingredient_id = p_ingredient_id
        AND custom_price = p_price
        AND is_active = 0;
        
        IF v_old_prices > 0 THEN 

            -- Update the old user prices  rather than create new one
            UPDATE user_prices
            SET is_active = TRUE,
                end_date = NULL,
                place = p_place
            WHERE user_id = p_user_id
            AND ingredient_id = p_ingredient_id
            AND custom_price = p_price
            AND is_active = 0;

        ELSE
            -- Insert new price
            INSERT INTO user_prices (
                user_id,
                ingredient_id,
                custom_price,
                quantity,
                base_unit,
                place,
                is_active,
                created_at
            )
            VALUES (
                p_user_id,
                p_ingredient_id,
                p_price,
                p_quantity,
                p_base_unit,
                p_place,
                1,
                CURRENT_TIMESTAMP
            );
        END IF;
    -- COMMIT;
END //
DELIMITER ;