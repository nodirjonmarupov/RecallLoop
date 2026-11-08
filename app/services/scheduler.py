from datetime import datetime
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models.review import Review  
from app.services.telegram import send_telegram_message

async def check_and_send_recalls():
   
    async with AsyncSessionLocal() as session:
        now = datetime.utcnow()
        
        stmt = select(Review).where(Review.next_review_at <= now)
        result = await session.execute(stmt)
        reviews = result.scalars().all()
        
        for review in reviews:
            chat_id = getattr(review, "telegram_id", None) 
            
            if chat_id:
                  
                    created_date = review.created_at.strftime("%Y-%m-%d %H:%M") if review.created_at else "Noma'lum"
                    
                    message = (
                        f"⏰ **Eslatma vaqti keldi!**\n\n"
                        f"📌 **Mavzu:** {review.content}\n"
                        f"📅 **Qo'shilgan sana:** {created_date}"
                    )
                    
                    try:
                        await send_telegram_message(chat_id, message)
                    except Exception as e:
                        print(f"Xatolik yuz berdi: {e}")