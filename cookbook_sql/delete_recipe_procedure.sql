DELIMITER //

CREATE PROCEDURE delete_recipe (
    IN p_user_id INT,
    IN p_recipe_id INT
)

BEGIN 
    DECLARE v_user_exist INT;
    DECLARE v_recipe_exist INT;
    DECLARE v_is_active INT;
        

    -- Validate if user exists
    SELECT COUNT(user_id) 
    INTO v_user_exist
    FROM users
    WHERE user_id = p_user_id;

    IF v_user_exist = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid user_id';
    END IF;

    SELECT recipe_id, user_id, is_active
    INTO v_recipe_exist, v_user_exist, v_is_active
    FROM recipes
    WHERE recipe_id = p_recipe_id;

    IF v_recipe_exist IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid recipe by the user';
    END IF;
    IF v_user_exist != p_user_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid owner of the recipe';
    END IF;
    IF v_is_active = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recipe already inactive';
    END IF;
    
    
    UPDATE recipes
    SET is_active = 0, end_date = CURRENT_TIMESTAMP
    WHERE recipe_id = p_recipe_id;

    UPDATE recipe_ingredients
    SET is_active = 0
    WHERE recipe_id = p_recipe_id;

END //
DELIMITER ;


    
