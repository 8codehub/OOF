package com.foxymoxy

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform