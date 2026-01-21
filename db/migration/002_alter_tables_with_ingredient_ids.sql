/* 
By adding the user_ingredients table we have to create a column to specify if ingredient id is coming from main or secondary table.
For this reason where ever ingredient id is used we need to make sure source it also used to connect it to correct table.
*/
ALTER TABLE `user_prices`
ADD COLUMN `ingredient_source` VARCHAR(20) NOT NULL DEFAULT 'main';

ALTER TABLE `recipe_ingredients`
ADD COLUMN `ingredient_source` VARCHAR(20) NOT NULL DEFAULT 'main';

ALTER TABLE `units`
ADD COLUMN `ingredient_source` VARCHAR(20) NOT NULL DEFAULT 'main';

ALTER TABLE `dish_ingredients`
ADD COLUMN `ingredient_source` VARCHAR(20) NOT NULL DEFAULT 'main';

ALTER TABLE `food_plan_ingredient_records`
ADD COLUMN `ingredient_source` VARCHAR(20) NOT NULL DEFAULT 'main';

ALTER TABLE units
DROP INDEX `unique_ingredient_unit`,
ADD UNIQUE KEY `unique_ingId_unitName_ingSource` (`ingredient_id`,`unit_name`,`ingredient_source`);
