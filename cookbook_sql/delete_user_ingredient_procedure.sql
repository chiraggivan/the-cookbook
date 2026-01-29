DELIMITER //

DROP PROCEDURE IF EXISTS delete_user_ingredient //
-- its for user's to use this procedure
-- the following procedure soft deletes user created ingredient  and its units along with recipe ingredient table
-- TABLES affected -- user_ingredients, units, recipe_ingredients
CREATE PROCEDURE delete_user_ingredient (
    IN p_ingredient_id INT,
    IN p_name VARCHAR(30),
    IN p_user_id INT
)
main_block: BEGIN
    DECLARE v_exists INT DEFAULT 0;

    -- Validate if user  is rightful owner of the ingredient in user ingredients table
    SELECT COUNT(*) INTO v_exists FROM user_ingredients WHERE user_ingredient_id = p_ingredient_id AND name = p_name AND submitted_by = p_user_id AND is_active = 1  ;
    IF v_exists = 0 THEN  
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No such active ingredient found for this user';  
    END IF;

    -- -------------------------------------------------------------------------------------------------------------------------------------------------------------
    UPDATE user_ingredients 
    SET is_active = 0, end_date = CURRENT_TIMESTAMP
    WHERE user_ingredient_id = p_ingredient_id AND  is_active = 1;

    UPDATE units
    SET is_active = 0, end_date = CURRENT_TIMESTAMP
    WHERE ingredient_id = p_ingredient_id AND ingredient_source = 'user' AND is_active = 1;

    UPDATE recipe_ingredients
    SET is_active = 0, end_date = CURRENT_TIMESTAMP
    WHERE ingredient_id = p_ingredient_id AND ingredient_source = 'user' AND is_active = 1;

END //
DELIMITER ;