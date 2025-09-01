import mysql.connector
from mysql.connector import Error
from config import Config

# Database configuration
db_config = {
    'host': Config.DB_HOST,
    'user': Config.DB_USER,
    'password': Config.DB_PASSWORD, 
    'database': Config.DB_NAME
}

# Helper function to get database connection
def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Error as err:
        print(f"Error connecting to database: {err}")
        return None