package com.garage.service;

import com.garage.dto.SupportChatDtos.BotRequested;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import jakarta.annotation.PreDestroy;
import java.util.concurrent.*;

@Component
public class SupportBotWorker {
    private final SupportBotService bot;
    private final SupportChatService chat;
    private final SupportBotContextService context;
    private final ThreadPoolExecutor executor = new ThreadPoolExecutor(2, 2, 0L, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(20), runnable -> {
                var thread = new Thread(runnable, "support-bot"); thread.setDaemon(true); return thread;
            }, new ThreadPoolExecutor.AbortPolicy());
    public SupportBotWorker(SupportBotService bot, SupportChatService chat, SupportBotContextService context) {
        this.bot = bot; this.chat = chat; this.context = context;
    }
    @TransactionalEventListener
    public void onMessage(BotRequested request) {
        try {
            executor.execute(() -> {
                com.garage.dto.SupportChatDtos.BotAnswer answer;
                try { answer = bot.answer(request.content(), context.context(request.conversationId()),
                        context.recent(request.conversationId(), request.messageId())); }
                catch (Exception e) { answer = SupportBotService.unavailable(); }
                chat.completeBot(request, answer);
            });
        } catch (RejectedExecutionException e) { chat.completeBot(request, SupportBotService.unavailable()); }
    }
    @PreDestroy public void close() { executor.shutdownNow(); }
}
