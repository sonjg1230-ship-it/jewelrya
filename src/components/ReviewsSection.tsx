import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, PenLine, Star, X } from 'lucide-react';
import type { JewelryMenuItem, ResolvedGooglePlaceInfo, VisitorReview } from '../shared/types';
import { ResilientImage } from './ResilientImage';

interface ReviewsSectionProps {
  reviews: VisitorReview[];
  googlePlaceInfo: ResolvedGooglePlaceInfo | null;
  menuItems: JewelryMenuItem[];
  onSubmitReview: (payload: {
    authorName: string;
    rating: number;
    visitPurpose: string;
    purchasedItem?: string;
    content: string;
    photos?: string[];
  }) => Promise<boolean>;
}

interface AttachedPhoto {
  id: string;
  name: string;
  dataUrl: string;
}

const VISIT_PURPOSES = [
  '커플링 맞춤 상담',
  '기념일 선물',
  '오늘의 추천템 시착',
  '주얼리 수선 · 케어',
  '기타 방문',
];

const MAX_PHOTOS = 3;

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
      img.src = result;
    };
    reader.onerror = () => reject(new Error('파일을 읽는 데 실패했습니다.'));
    reader.readAsDataURL(file);
  });
}

export function ReviewsSection({
  reviews,
  googlePlaceInfo,
  menuItems,
  onSubmitReview,
}: ReviewsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [visitPurpose, setVisitPurpose] = useState(VISIT_PURPOSES[0]);
  const [purchasedItem, setPurchasedItem] = useState('');
  const [content, setContent] = useState('');
  const [attachedPhotos, setAttachedPhotos] = useState<AttachedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const [lightboxState, setLightboxState] = useState<{
    photos: string[];
    index: number;
    caption: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!lightboxState) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxState(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxState((prev) =>
          prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null
        );
      } else if (e.key === 'ArrowLeft') {
        setLightboxState((prev) =>
          prev ? { ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length } : null
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxState]);

  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { avg: '0.0', count: 0 };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      avg: (sum / reviews.length).toFixed(1),
      count: reviews.length,
    };
  }, [reviews]);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setPhotoError(null);

    const remaining = MAX_PHOTOS - attachedPhotos.length;
    if (remaining <= 0) {
      setPhotoError(`사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);
      return;
    }

    const candidates = Array.from(fileList);
    const validImages = candidates.filter((file) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type.toLowerCase()) ||
      file.type.startsWith('image/')
    );

    if (validImages.length === 0) {
      setPhotoError('JPG, PNG, WEBP 형식의 이미지 파일만 첨부할 수 있습니다.');
      return;
    }

    if (candidates.length > remaining) {
      setPhotoError(`최대 ${MAX_PHOTOS}장까지 첨부 가능하여 ${remaining}장만 추가됩니다.`);
    }

    const slice = validImages.slice(0, remaining);
    setIsProcessingPhotos(true);
    try {
      const processed: AttachedPhoto[] = [];
      for (const file of slice) {
        if (file.size > 15 * 1024 * 1024) {
          setPhotoError('15MB 이하의 이미지 파일만 첨부해 주세요.');
          continue;
        }
        const dataUrl = await compressImageToDataUrl(file);
        processed.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          dataUrl,
        });
      }
      setAttachedPhotos((prev) => [...prev, ...processed].slice(0, MAX_PHOTOS));
    } catch {
      setPhotoError('이미지를 처리하는 중 문제가 발생했습니다. 다른 사진을 선택해 주세요.');
    } finally {
      setIsProcessingPhotos(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFilesSelected(e.target.files);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    void handleFilesSelected(e.dataTransfer.files);
  };

  const handleRemovePhoto = (id: string) => {
    setAttachedPhotos((prev) => prev.filter((p) => p.id !== id));
    setPhotoError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    const ok = await onSubmitReview({
      authorName: authorName.trim(),
      rating,
      visitPurpose,
      purchasedItem: purchasedItem || undefined,
      content: content.trim(),
      photos: attachedPhotos.length > 0 ? attachedPhotos.map((p) => p.dataUrl) : undefined,
    });
    setIsSubmitting(false);
    if (ok) {
      setAuthorName('');
      setContent('');
      setPurchasedItem('');
      setAttachedPhotos([]);
      setPhotoError(null);
      setRating(5);
      setShowForm(false);
      setSubmitMessage('소중한 방문 리뷰가 등록되었습니다.');
    }
  };

  return (
    <section id="reviews" className="py-16 lg:py-24 border-t border-[#E5E0D8] bg-[#F6F4EF]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs tracking-wider text-[#9A7B4F] font-medium mb-2">VISITOR REVIEWS</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] [text-wrap:balance]">
              방문자 리뷰
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-[#57534E]">
              <div className="inline-flex items-center gap-1.5 font-semibold text-[#1C1917] tabular-nums">
                <Star className="w-4 h-4 fill-[#9A7B4F] text-[#9A7B4F]" />
                <span>{stats.avg} / 5.0</span>
              </div>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">매장 방문 후기 {stats.count}건</span>
              {googlePlaceInfo?.rating != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Google 지도 평점 {googlePlaceInfo.rating.toFixed(1)}
                    {googlePlaceInfo.userRatingCount ? ` (${googlePlaceInfo.userRatingCount}건)` : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((prev) => !prev);
              setSubmitMessage(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1C1917] text-[#FAF9F6] text-sm font-medium rounded-lg hover:bg-[#332E2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PenLine className="w-4 h-4" />
            <span>{showForm ? '작성 닫기' : '방문 리뷰 남기기'}</span>
          </button>
        </div>

        {submitMessage && (
          <div className="mb-6 p-4 bg-white border border-[#D6CFC4] rounded-xl flex items-center gap-2 text-sm text-[#166534]">
            <Check className="w-4 h-4 shrink-0" />
            <span>{submitMessage}</span>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-10 p-6 bg-white border border-[#E5E0D8] rounded-xl space-y-5"
          >
            <h3 className="text-base font-semibold text-[#1C1917]">쥬얼리아 방문 후기 작성</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">작성자 성함</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="예: 김하늘"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">방문 목적</label>
                <select
                  value={visitPurpose}
                  onChange={(e) => setVisitPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
                >
                  {VISIT_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">관심/구매 품목 (선택)</label>
                <select
                  value={purchasedItem}
                  onChange={(e) => setPurchasedItem(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
                >
                  <option value="">선택 안 함</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">만족도 별점</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`${star}점 선택`}
                    className="p-1.5 rounded-md hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating ? 'fill-[#9A7B4F] text-[#9A7B4F]' : 'text-[#D6CFC4]'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs text-[#57534E] tabular-nums">{rating}점</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">후기 내용</label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="매장 분위기, 상담 경험, 제품 착용감 등에 대한 솔직한 후기를 남겨주세요."
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#E5E0D8] rounded-lg focus:outline-none focus:border-[#9A7B4F]"
              />
            </div>

            {/* Jewelry Photo File Attachment Interface */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="review-photo-upload" className="text-xs font-medium text-[#57534E]">
                  구매한 주얼리 사진 첨부 (선택)
                </label>
                <span className="text-xs text-[#78716C] tabular-nums">
                  {attachedPhotos.length} / {MAX_PHOTOS}장
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border border-dashed rounded-xl p-4 transition-colors ${
                  isDragging
                    ? 'border-[#9A7B4F] bg-[#F2EFE9]/70'
                    : 'border-[#D6CFC4] bg-[#FAF9F6]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="review-photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  multiple
                  onChange={handleFileChange}
                  className="sr-only"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-[#E5E0D8] flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4 text-[#9A7B4F]" />
                    </div>
                    <div className="text-xs text-[#57534E]">
                      <p className="font-medium text-[#1C1917]">
                        매장에서 구매하신 주얼리 착용샷이나 제품 사진을 첨부해 주세요
                      </p>
                      <p className="text-[#78716C] mt-0.5">
                        파일을 여기로 끌어다 놓거나 사진 선택 버튼을 누르세요 (JPG, PNG, WEBP · 최대 {MAX_PHOTOS}장)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={attachedPhotos.length >= MAX_PHOTOS || isProcessingPhotos}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-medium text-[#1C1917] bg-white border border-[#D6CFC4] hover:border-[#9A7B4F] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isProcessingPhotos ? '이미지 준비 중...' : '사진 파일 선택'}
                  </button>
                </div>

                {photoError && (
                  <p className="mt-3 text-xs text-amber-800">{photoError}</p>
                )}

                {attachedPhotos.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#E5E0D8] grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {attachedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-lg overflow-hidden border border-[#E5E0D8] bg-white group"
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          aria-label={`${photo.name} 첨부 삭제`}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#1C1917]/80 text-white flex items-center justify-center hover:bg-[#1C1917] transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isProcessingPhotos}
                className="px-5 py-2.5 text-xs font-medium bg-[#1C1917] text-[#FAF9F6] rounded-lg hover:bg-[#332E2A] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSubmitting ? '등록 중...' : '리뷰 등록하기'}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="flex flex-col justify-between p-6 bg-white border border-[#E5E0D8] rounded-xl"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-0.5" aria-label={`별점 ${review.rating}점`}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-3.5 h-3.5 ${
                          idx < review.rating ? 'fill-[#9A7B4F] text-[#9A7B4F]' : 'text-[#E5E0D8]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#78716C] tabular-nums">{review.createdAt}</span>
                </div>

                {review.purchasedItem && (
                  <p className="text-xs font-medium text-[#9A7B4F] mb-2">{review.purchasedItem}</p>
                )}

                <p className="text-sm text-[#44403C] leading-relaxed mb-4">{review.content}</p>

                {review.photos && review.photos.length > 0 && (
                  <div
                    className={`mb-5 grid gap-2 ${
                      review.photos.length === 1
                        ? 'grid-cols-1'
                        : review.photos.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-3'
                    }`}
                  >
                    {review.photos.map((photoUrl, pIdx) => (
                      <button
                        key={photoUrl}
                        type="button"
                        onClick={() =>
                          setLightboxState({
                            photos: review.photos!,
                            index: pIdx,
                            caption: `${review.authorName}님의 ${review.purchasedItem || '방문 후기'} 사진`,
                          })
                        }
                        className={`relative rounded-lg overflow-hidden border border-[#E5E0D8] bg-[#F2EFE9] cursor-pointer group ${
                          review.photos!.length === 1 ? 'aspect-[4/3]' : 'aspect-square'
                        }`}
                      >
                        <ResilientImage
                          src={photoUrl}
                          alt={`${review.authorName}님 구매 주얼리 사진 ${pIdx + 1}`}
                          fallbackTitle="후기 사진"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#F0ECE4] flex items-center gap-2 text-xs text-[#78716C]">
                <span className="font-medium text-[#1C1917]">{review.authorName}</span>
                <span aria-hidden="true">·</span>
                <span>{review.visitPurpose}</span>
                {review.verifiedVisit && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>방문 인증</span>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Live Google Maps Reviews (shown only when returned by Google Places API) */}
        {googlePlaceInfo && googlePlaceInfo.googleReviews.length > 0 && (
          <div className="mt-10 pt-10 border-t border-[#E5E0D8]">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h3 className="text-base font-semibold text-[#1C1917]">
                Google 지도 실시간 리뷰 ({googlePlaceInfo.matchedPlaceName || '쥬얼리아'})
              </h3>
              {googlePlaceInfo.googleMapsUri && (
                <a
                  href={googlePlaceInfo.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-[#7D623C] hover:underline"
                >
                  Google 지도에서 더보기
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {googlePlaceInfo.googleReviews.map((gr, idx) => (
                <article key={idx} className="p-5 bg-white border border-[#E5E0D8] rounded-xl">
                  <div className="flex items-center justify-between text-xs text-[#78716C] mb-2">
                    <span className="font-medium text-[#1C1917]">{gr.authorName}</span>
                    <span>{gr.relativePublishTimeDescription}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-2.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s < gr.rating ? 'fill-[#9A7B4F] text-[#9A7B4F]' : 'text-[#E5E0D8]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-[#44403C] leading-relaxed">{gr.text}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {lightboxState && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="리뷰 사진 크게 보기"
          onClick={() => setLightboxState(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#1C1917] rounded-xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-xs text-[#FAF9F6]">
              <span>
                {lightboxState.caption} ({lightboxState.index + 1} / {lightboxState.photos.length})
              </span>
              <button
                type="button"
                onClick={() => setLightboxState(null)}
                aria-label="닫기"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={lightboxState.photos[lightboxState.index]}
                alt={lightboxState.caption}
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />

              {lightboxState.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="이전 사진"
                    onClick={() =>
                      setLightboxState((prev) =>
                        prev
                          ? { ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length }
                          : null
                      )
                    }
                    className="absolute left-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="다음 사진"
                    onClick={() =>
                      setLightboxState((prev) =>
                        prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null
                      )
                    }
                    className="absolute right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
