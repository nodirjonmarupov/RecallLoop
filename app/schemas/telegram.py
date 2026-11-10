from pydantic import BaseModel


class TelegramConnectResponse(BaseModel):
    code: str
    expires_in: int


class TelegramChat(BaseModel):
    id: int


class TelegramMessage(BaseModel):
    chat: TelegramChat
    text: str | None = None


class TelegramUpdate(BaseModel):
    message: TelegramMessage | None = None

    