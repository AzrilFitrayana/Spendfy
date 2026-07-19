"use server";

import { cookies } from "next/headers";

interface RegisterUserParams {
  name: string;
  email: string;
  password: string;
  currency: string;
}

interface LoginUserParams {
  email: string;
  password: string;
}

export const registerUsers = async (params: RegisterUserParams) => {
  try {
    const result = await fetch(`${process.env.BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await result.json();

    if (!result.ok) {
      throw new Error(data.message);
    }

    const cookieStore = await cookies();
    cookieStore.set("token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      data: error instanceof Error ? error : "Registration failed",
    };
  }
};
