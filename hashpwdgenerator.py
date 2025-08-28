from bcrypt import hashpw, gensalt
password = 'chirag'  # Replace with desired password
hashed = hashpw(password.encode('utf-8'), gensalt()).decode('utf-8')
print(hashed)  # Outputs something like: $2b$12$...