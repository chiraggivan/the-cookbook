DELIMITER //
CREATE TRIGGER after_ingredient_insert
AFTER INSERT ON ingredients
FOR EACH ROW
BEGIN
    IF LOWER(NEW.base_unit) = 'kg' THEN
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
        VALUES
            (NEW.ingredient_id, 'kg', 1.000000, TRUE, CURRENT_TIMESTAMP),
            (NEW.ingredient_id, 'g', 0.001000, TRUE, CURRENT_TIMESTAMP);
    ELSEIF LOWER(NEW.base_unit) IN ('liter', 'litre') THEN
        INSERT INTO units (ingredient_id, unit_name, conversion_factor, is_active, created_at)
        VALUES
            (NEW.ingredient_id, 'liter', 1.000000, TRUE, CURRENT_TIMESTAMP),
            (NEW.ingredient_id, 'ml', 0.001000, TRUE, CURRENT_TIMESTAMP),
            (NEW.ingredient_id, 'tsp', 0.005000, TRUE, CURRENT_TIMESTAMP),
            (NEW.ingredient_id, 'tbsp', 0.015000, TRUE, CURRENT_TIMESTAMP),
            (NEW.ingredient_id, 'cup', 0.240000, TRUE, CURRENT_TIMESTAMP);
    END IF;
END //
DELIMITER ;