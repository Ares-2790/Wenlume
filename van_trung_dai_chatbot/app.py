import os
import time

import streamlit as st
from google import genai

from prompts import TABS, TAB_BY_ID, TabConfig

st.set_page_config(page_title="Văn Học AI Tutor", page_icon="📚")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    try:
        api_key = st.secrets.get("GEMINI_API_KEY")
    except (FileNotFoundError, KeyError, AttributeError):
        api_key = None

if not api_key:
    st.error(
        "Chưa có GEMINI_API_KEY. Hãy đặt API key trong biến môi trường rồi chạy lại."
    )
    st.code(
        "# PowerShell (phiên hiện tại)\n"
        '$env:GEMINI_API_KEY = "your-api-key-here"\n'
        "streamlit run app.py",
        language="powershell",
    )
    st.stop()

client = genai.Client(api_key=api_key)

MODEL_OPTIONS = {
    "Gemini 2.5 Pro (khuyên dùng)": "gemini-2.5-pro",
    "Gemini 2.5 Flash": "gemini-2.5-flash",
    "Gemini 2.0 Flash": "gemini-2.0-flash",
    "Gemini 3.5 Flash": "gemini-3.5-flash",
}
FALLBACK_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"]


def messages_key(tab_id: str) -> str:
    return f"messages_{tab_id}"


def interaction_key(tab_id: str) -> str:
    return f"last_interaction_id_{tab_id}"


def init_tab_state(tab: TabConfig) -> None:
    tab_id = tab["id"]
    if messages_key(tab_id) not in st.session_state:
        st.session_state[messages_key(tab_id)] = [
            {"role": "assistant", "content": tab["welcome_message"]}
        ]
    if interaction_key(tab_id) not in st.session_state:
        st.session_state[interaction_key(tab_id)] = None


def build_prompt(tab: TabConfig, user_input: str) -> str:
    history = "\n".join(
        f"{msg['role']}: {msg['content']}"
        for msg in st.session_state[messages_key(tab["id"])][-10:]
        if msg["role"] in ("user", "assistant")
    )
    return (
        f"{tab['system_prompt']}\n\n"
        f"Lịch sử hội thoại:\n{history}\n\n"
        f"Học sinh: {user_input}"
    )


def extract_answer(interaction) -> str:
    if hasattr(interaction, "output_text") and interaction.output_text:
        return interaction.output_text
    if interaction.outputs:
        return interaction.outputs[-1].text
    return "Không nhận được phản hồi từ mô hình. Vui lòng thử lại."


def is_temporary_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("high demand", "500", "503", "429", "overloaded", "try again")
    )


def call_gemini(
    tab: TabConfig,
    user_input: str,
    preferred_model: str,
) -> tuple[str, str | None]:
    tab_id = tab["id"]
    models = [preferred_model] + [m for m in FALLBACK_MODELS if m != preferred_model]
    last_error = None

    for model in models:
        for attempt in range(2):
            try:
                use_state = (
                    model == preferred_model
                    and st.session_state[interaction_key(tab_id)] is not None
                )
                prompt = user_input if use_state else build_prompt(tab, user_input)

                kwargs = {"model": model, "input": prompt}
                if use_state:
                    kwargs["previous_interaction_id"] = st.session_state[
                        interaction_key(tab_id)
                    ]

                interaction = client.interactions.create(**kwargs)
                answer = extract_answer(interaction)
                if model != preferred_model:
                    answer = (
                        f"*(Đã tự chuyển sang model `{model}` "
                        f"vì model trước đang quá tải.)*\n\n{answer}"
                    )
                return answer, interaction.id
            except Exception as exc:
                last_error = exc
                if is_temporary_error(exc) and attempt == 0:
                    time.sleep(2)
                    continue
                if is_temporary_error(exc):
                    break
                raise

    raise last_error if last_error else RuntimeError("Không gọi được API Gemini.")


def render_chat_tab(tab: TabConfig, preferred_model: str) -> None:
    tab_id = tab["id"]
    init_tab_state(tab)

    st.title(tab["title"])
    st.caption(tab["caption"])

    for msg in st.session_state[messages_key(tab_id)]:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])

    user_input = st.chat_input(
        tab["chat_placeholder"],
        key=f"chat_input_{tab_id}",
    )

    if user_input:
        st.session_state.active_tab_id = tab_id
        st.session_state[messages_key(tab_id)].append(
            {"role": "user", "content": user_input}
        )
        with st.chat_message("user"):
            st.write(user_input)

        with st.chat_message("assistant"):
            with st.spinner("Đang suy nghĩ..."):
                try:
                    answer, interaction_id = call_gemini(
                        tab, user_input, preferred_model
                    )
                    st.session_state[interaction_key(tab_id)] = interaction_id
                    st.write(answer)
                except Exception as exc:
                    answer = (
                        f"Lỗi khi gọi API: {exc}\n\n"
                        "**Gợi ý:** Model đang quá tải hoặc tạm lỗi. "
                        "Thử chọn **Gemini 2.5 Pro** ở sidebar, đợi 1–2 phút rồi gửi lại."
                    )
                    st.error(answer)

        st.session_state[messages_key(tab_id)].append(
            {"role": "assistant", "content": answer}
        )


for tab in TABS:
    init_tab_state(tab)

if "active_tab_id" not in st.session_state:
    st.session_state.active_tab_id = TABS[0]["id"]

selected_model = st.sidebar.selectbox(
    "Model AI",
    options=list(MODEL_OPTIONS.keys()),
    index=0,
    help="Nếu một model báo quá tải, app sẽ tự thử model khác.",
)
preferred_model = MODEL_OPTIONS[selected_model]

if st.sidebar.button("Xóa lịch sử chat"):
    active = TAB_BY_ID[st.session_state.active_tab_id]
    st.session_state[messages_key(active["id"])] = [
        {"role": "assistant", "content": active["welcome_message"]}
    ]
    st.session_state[interaction_key(active["id"])] = None
    st.rerun()

tab_labels = [tab["label"] for tab in TABS]
tab_widgets = st.tabs(tab_labels)

for tab, widget in zip(TABS, tab_widgets):
    with widget:
        render_chat_tab(tab, preferred_model)
