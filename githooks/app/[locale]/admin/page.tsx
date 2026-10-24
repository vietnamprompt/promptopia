"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { PostStatus, PostTypeFromDb } from "@/interfaces/Post";
import { usePromptopiaContext } from "@/contexts/PromptopiaContext";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";

const tabs = [PostStatus.PENDING, PostStatus.REJECTED, PostStatus.APPROVED];

const Admin_Page: React.FC = () => {
	const t = useTranslations("Admin");
	const { session, setPosts } = usePromptopiaContext();
	const [tab, setTab] = useState<PostStatus>(PostStatus.PENDING);
	const [list, setList] = useState<PostTypeFromDb[]>([]);
	const [loading, setLoading] = useState(true);
	const [messageKey, setMessageKey] = useState("");
	const [copied, setCopied] = useState("");
	const [busyId, setBusyId] = useState("");
	const isAdmin = !!session?.user?.isAdmin;

	const loadPosts = useCallback(async () => {
		setLoading(true);

		try {
			const response = await fetch(`/api/admin/posts?status=${tab}`);

			if (response.ok) {
				setList((await response.json()).posts ?? []);
			} else {
				setList([]);
				setMessageKey("error");
			}
		} catch (error) {
			console.error(error);
			setMessageKey("error");
		} finally {
			setLoading(false);
		}
	}, [tab]);

	useEffect(() => {
		if (isAdmin) {
			setMessageKey("");
			loadPosts();
		}
	}, [isAdmin, loadPosts]);

	const moderate = async (post: PostTypeFromDb, status: PostStatus) => {
		setBusyId(post._id);
		setMessageKey("");

		try {
			const response = await fetch("/api/admin/posts", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: post._id, status, updatedAt: post.updatedAt }),
			});

			if (response.status === 409) {
				// The creator has edited the post in the meantime.
				setMessageKey("changed");
				await loadPosts();

				return;
			}

			if (!response.ok) {
				setMessageKey("error");

				return;
			}

			const moderatedPost = (await response.json()).post as PostTypeFromDb;

			// Keep the homepage in sync without reloading the page.
			setPosts((prevPosts) => {
				const others = prevPosts.filter((item) => item._id !== moderatedPost._id);

				return status === PostStatus.APPROVED ? [...others, moderatedPost] : others;
			});

			setList((prevList) => prevList.filter((item) => item._id !== moderatedPost._id));
		} catch (error) {
			console.error(error);
			setMessageKey("error");
		} finally {
			setBusyId("");
		}
	};

	// The session is still loading.
	if (!session) {
		return null;
	}

	if (!isAdmin) {
		return (
			<section className="page_section_left w-full">
				<Header gradient="red_gradient" textStyle="text-left" titleGradient={t("noAccess")} />
			</section>
		);
	}

	return (
		<section className="page_section_left w-full">
			<Header
				desc={t("description")}
				gradient="blue_gradient"
				textStyle="text-left"
				titleGradient={t("title")}
			/>

			<div className="mt-10 flex flex-wrap gap-3">
				{tabs.map((item) => (
					<button
						key={item}
						className={`_btn ${tab === item ? "orange_invert" : "gray_light"}`}
						type="button"
						onClick={() => setTab(item)}
					>
						{t(`tabs.${item}`)}
					</button>
				))}
			</div>

			{messageKey && <p className="form_error mt-4 text-sm">{t(messageKey)}</p>}

			{loading ? (
				<p className="mt-10 text-mlt-dark-6">{t("loading")}</p>
			) : list.length === 0 ? (
				<p className="mt-10 text-mlt-dark-6">{t("empty")}</p>
			) : (
				<div className="mt-10 grid w-full gap-8 sm:grid-cols-2 xl:grid-cols-3">
					{list.map((post) => (
						<div key={post._id}>
							<PostCard copied={copied} post={post} setCopied={setCopied} />

							<div className="-mt-5 mb-6 flex justify-end gap-3">
								{tab !== PostStatus.APPROVED && (
									<button
										className="_btn orange_invert"
										disabled={busyId === post._id}
										type="button"
										onClick={() => moderate(post, PostStatus.APPROVED)}
									>
										{t("approve")}
									</button>
								)}

								{tab !== PostStatus.REJECTED && (
									<button
										className="_btn red_invert"
										disabled={busyId === post._id}
										type="button"
										onClick={() => moderate(post, PostStatus.REJECTED)}
									>
										{t("reject")}
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
};

export default Admin_Page;
