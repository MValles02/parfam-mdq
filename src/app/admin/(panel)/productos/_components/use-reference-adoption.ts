import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { EditableProduct } from "@/lib/admin/products";
import type { AdoptableReference } from "@/lib/admin/references";
import type {
  ProductFormInput,
  ProductFormValues,
} from "@/lib/validations/product";
import { deleteUploadedImage, importReferencePicture } from "../image-actions";
import {
  appendNewImage,
  removeImageAt,
  type ProductImageItem,
} from "./image-list";
import {
  COMMUNITY_DERIVED_FIELDS,
  getInitialAdoptedReference,
} from "./product-form-values";
import type { AdoptedReference } from "./reference-step";

const REFERENCE_PICTURE_FAILED_MESSAGE =
  "No pudimos traer la foto de referencia; podés subirla a mano.";

/**
 * Adopting and unlinking a reference in `ProductForm`: prefilled values, the
 * internal English description, and the one-time copy of the reference
 * picture into R2, including discarding that copy when it stops applying.
 */
export function useReferenceAdoption({
  product,
  form,
  onAdopt,
}: {
  product: EditableProduct | null;
  form: UseFormReturn<ProductFormInput, unknown, ProductFormValues>;
  /** Runs on every adoption, for form state this hook does not own. */
  onAdopt: (reference: AdoptableReference) => void;
}) {
  const { getValues, setValue } = form;
  const [adoptedReference, setAdoptedReference] =
    useState<AdoptedReference | null>(getInitialAdoptedReference(product));
  /** The reference's English copy helps writing but is never published. */
  const [referenceText, setReferenceText] = useState<string | null>(null);
  const [isImportingReferencePicture, setIsImportingReferencePicture] =
    useState(false);
  // Identifies the current picture import call. Incremented on every new
  // adoption and on every unlink, so a response belongs to the admin's latest
  // action only if it still holds the token it was issued; any earlier
  // adoption's response (or one abandoned by an unlink) is discarded instead
  // of appended to the wrong product.
  const pictureImportToken = useRef(0);
  // Storage key of the picture copied in for whichever reference is
  // currently adopted, if that import has already resolved. Lets unlinking
  // or adopting a different reference remove that one picture instead of
  // leaving it (or, on a second adoption, both pictures) in the images list.
  const currentReferencePictureKey = useRef<string | null>(null);
  // Keys the product already had in R2 when this form loaded. A picture
  // tracked above that is one of these was saved in an earlier session, so it
  // must be left for the admin to remove by hand rather than deleted here.
  const [savedStorageKeys] = useState(
    () => new Set(product?.images.map((image) => image.storageKey) ?? []),
  );

  function getCurrentImages() {
    return (getValues("images") ?? []) as ProductImageItem[];
  }

  // Single source of truth for adding an image: it reads the form's current
  // `images` value and writes the appended result in the same synchronous
  // step, so the manual-upload flow (`ImagePanel`'s `onUploadComplete`) and
  // the reference-picture import below cannot read each other's stale value
  // and either drop an image or mark two of them primary.
  function appendImage(storageKey: string) {
    setValue("images", appendNewImage(getCurrentImages(), storageKey));
  }

  // Drops the picture tracked in `currentReferencePictureKey`, if it was
  // never saved: removes it from the form's images (reassigning primary when
  // it was the primary image) and deletes the R2 object. A picture that was
  // already part of the product when the form loaded is left alone instead,
  // since the admin may still want it.
  function releaseCurrentReferencePicture() {
    const key = currentReferencePictureKey.current;
    currentReferencePictureKey.current = null;
    if (!key || savedStorageKeys.has(key)) return;

    const currentImages = getCurrentImages();
    const index = currentImages.findIndex((image) => image.storageKey === key);
    if (index === -1) return;

    setValue("images", removeImageAt(currentImages, index));
    void deleteUploadedImage(key).catch(() => {});
  }

  // Copy the reference's picture into R2 exactly once per adoption. The
  // form keeps working meanwhile; a failure keeps the adoption and just
  // leaves the photo for the admin to upload by hand.
  function importPicture(referenceId: string) {
    const importToken = ++pictureImportToken.current;
    setIsImportingReferencePicture(true);
    void importReferencePicture(referenceId)
      .then((result) => {
        if (pictureImportToken.current !== importToken) {
          // A later unlink or adoption already moved past this import; its
          // upload would otherwise stay orphaned in R2.
          if (result.ok)
            void deleteUploadedImage(result.data.storageKey).catch(() => {});
          return;
        }
        setIsImportingReferencePicture(false);
        if (!result.ok) {
          toast.error(REFERENCE_PICTURE_FAILED_MESSAGE);
          return;
        }
        appendImage(result.data.storageKey);
        currentReferencePictureKey.current = result.data.storageKey;
      })
      .catch(() => {
        if (pictureImportToken.current !== importToken) return;
        setIsImportingReferencePicture(false);
        toast.error(REFERENCE_PICTURE_FAILED_MESSAGE);
      });
  }

  function adoptReference(reference: AdoptableReference) {
    // Release whatever picture the previously adopted reference (if any)
    // copied in, so adopting a second reference does not append its picture
    // next to the first one.
    releaseCurrentReferencePicture();

    // Prepopulate every field known to the dataset, while keeping the product
    // editable so future reimports cannot overwrite it.
    setAdoptedReference({
      id: reference.id,
      name: reference.name,
      referenceUrl: reference.referenceUrl,
    });
    setReferenceText(reference.descriptionEn);
    onAdopt(reference);
    setValue("fragranceRefId", reference.id);
    setValue("sourceUrl", reference.referenceUrl);
    setValue("name", reference.name, { shouldValidate: true });
    setValue("brandId", reference.brand.id);
    setValue("brandName", reference.brand.name, { shouldValidate: true });
    setValue("year", reference.year);
    setValue("gender", reference.gender);
    setValue("collection", reference.collection);
    setValue("longevity", reference.longevity);
    setValue("sillage", reference.sillage);
    setValue("seasonSpring", reference.seasonSpring);
    setValue("seasonSummer", reference.seasonSummer);
    setValue("seasonFall", reference.seasonFall);
    setValue("seasonWinter", reference.seasonWinter);
    setValue("daypartDay", reference.daypartDay);
    setValue("daypartNight", reference.daypartNight);
    setValue(
      "notes",
      reference.notes.map((note) => ({
        noteId: note.noteId,
        position: note.position,
        weight: note.weight,
      })),
    );
    setValue(
      "accords",
      reference.accords.map((accord) => ({
        accordId: accord.accordId,
        strength: accord.strength,
      })),
    );
    setValue(
      "perfumerIds",
      reference.perfumers.map((perfumer) => perfumer.perfumerId),
    );

    importPicture(reference.id);
  }

  function unlinkReference() {
    // Invalidate any picture import still in flight: its result would belong
    // to the reference the admin just unlinked, not to the current adoption.
    pictureImportToken.current += 1;
    setIsImportingReferencePicture(false);
    releaseCurrentReferencePicture();
    setAdoptedReference(null);
    setReferenceText(null);
    setValue("fragranceRefId", null);
    for (const field of COMMUNITY_DERIVED_FIELDS) setValue(field, null);

    toast.info(
      "Desvinculamos la referencia y limpiamos los datos de la comunidad.",
    );
  }

  return {
    adoptedReference,
    referenceText,
    isImportingReferencePicture,
    appendImage,
    adoptReference,
    unlinkReference,
  };
}
