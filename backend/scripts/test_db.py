# scripts/cleanup_and_test_db.py
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

def cleanup_calendar_tables():
    """Drop existing calendar tables and enum types"""
    cleanup_statements = [
        "DROP TABLE IF EXISTS event_reminders CASCADE;",
        "DROP TABLE IF EXISTS event_participants CASCADE;", 
        "DROP TABLE IF EXISTS events CASCADE;",
        "DROP TYPE IF EXISTS eventtype CASCADE;",
        "DROP TYPE IF EXISTS recurrencetype CASCADE;"
    ]
    
    try:
        engine = create_engine(os.getenv("DATABASE_URL"))
        with engine.connect() as conn:
            print("🧹 Cleaning up existing calendar tables and enums...")
            
            for statement in cleanup_statements:
                try:
                    conn.execute(text(statement))
                    print(f"   ✅ Executed: {statement}")
                except Exception as e:
                    print(f"   ⚠️  {statement} - {e}")
            
            conn.commit()
            print("🧹 Cleanup completed!")
            
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        return False
    
    return True

def test_connection():
    """Test database connection"""
    try:
        engine = create_engine(os.getenv("DATABASE_URL"))
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Database Cleanup and Connection Test")
    print("=" * 50)
    
    # Test connection first
    if not test_connection():
        exit(1)
    
    # Cleanup tables
    if not cleanup_calendar_tables():
        exit(1)
    
    # Test connection again
    if test_connection():
        print("\n🎉 Ready to run: python scripts/init_db.py")
    else:
        print("\n❌ Connection lost after cleanup")
        exit(1)