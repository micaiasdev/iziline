from django.contrib import admin

from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'trip', 'sender', 'sent_at', 'short_content')
    list_filter = ('sent_at',)
    search_fields = ('trip__origin', 'trip__destination', 'sender__username', 'content')
    readonly_fields = ('sent_at',)

    def short_content(self, obj):
        return obj.content[:60] + '...' if len(obj.content) > 60 else obj.content
    short_content.short_description = 'Conteúdo'