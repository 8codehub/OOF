package com.line.runner

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform